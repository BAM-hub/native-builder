import { exec, spawn } from "child_process";
import { app, BrowserWindow, dialog } from "electron";
import express from "express";
import fs from "fs";
import path from "path";
import { createReadStream } from "tail-file-stream";
const net = require("net");

const META_PATH = path.join(app.getPath("userData"), "meta.json");

console.log(META_PATH);

const BASE_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "app", ".vite", "build")
  : __dirname;

const exePath = path.join(BASE_PATH, "bin", "native-builder.exe");
const scriptPath = path.join(BASE_PATH, "bin", "movebuild.bat");

function getMeta() {
  try {
    const data = fs.readFileSync(META_PATH, {
      encoding: "utf-8",
    });
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function getJavaInfo(callback) {
  exec("java -version", (err, stdout, stderr) => {
    if (err) {
      return callback({ installed: false });
    }

    const versionLine = stderr.split("\n")[0].trim();
    const javaHome = process.env.JAVA_HOME || null;

    exec("where java", (err2, stdout2) => {
      const javaPath = !err2 ? stdout2.trim().split("\n")[0] : null;

      callback({
        installed: true,
        version: versionLine,
        javaHome,
        javaPath,
      });
    });
  });
}

function stdListner(id, childProcess, onClose) {
  childProcess.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
    if (typeof listner === "function") listner(data, false);
    fs.appendFile(BASE_PATH + `${id}.txt`, data, (err) => {
      if (err) {
        console.error("error", err);
      }
    });
  });
  childProcess.on("close", (...args) => {
    if (typeof listner === "function") listner(null, true);

    onClose(...args);
  });
}

export function createServer() {
  let childProcess = null;
  let tempId = null;
  const api = express();
  api.use(express.json());
  api.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    ); // Allowed methods
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    ); // Allowed headers

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });

  function watchProjects() {
    const meta = getMeta();
    let miniWindow = null;
    let isPenging = false;
    let currentProject = null;

    function ping() {
      if (isPenging) return;
      isPenging = true;
      try {
        const socket = net.Socket();
        socket.once("connect", () => {
          console.log("app now connected === the build is done !!!!!!");
          if (miniWindow) return;
          miniWindow = new BrowserWindow({
            width: 800,
            height: 300,
            resizable: false,
            maximizable: false,
            alwaysOnTop: true,
            webPreferences: {
              devTools: !app.isPackaged,
              preload: path.join(__dirname, "preload.js"),
            },
          });

          miniWindow.webContents.once("did-finish-load", () => {
            miniWindow.webContents.send("custom-data", {
              id: currentProject,
            });
          });

          if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
            miniWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
          } else {
            miniWindow.loadFile(
              path.join(
                __dirname,
                `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
              )
            );
          }
          miniWindow.on("closed", () => {
            miniWindow = null;
          });

          socket.destroy();
          isPenging = false;
        });
        socket.once("error", (err) => {
          // Suppress expected connection errors
          // console.log(`Port ${port} not open yet: ${err.message}`);

          setTimeout(() => {
            socket.destroy();
            isPenging = false;
            ping();
          }, 5000);
        });
        socket.connect(8080, "localhost");
      } catch (err) {
        console.log(err);
      }
    }

    meta.forEach(({ project, id }) => {
      const projectPath = project
        .split("\\")
        .filter((str) => !str.includes(".mpr"));
      try {
        fs.watch(
          path.join(projectPath, "deployment", "native"),
          {},
          (event, filename) => {
            if (!childProcess) {
              currentProject = id;
              console.log("will start pinging !!!!!!!!!!", filename);
              // Todo ping is useless now please remove later
              ping();
            }
          }
        );

        console.log("watching ", projectPath);
      } catch {
        console.error("watching project failed " + projectPath);
      }
    });
  }
  watchProjects();

  function clearTempFile() {
    if (tempId)
      fs.unlink(BASE_PATH + `${tempId}.txt`, (err) => {
        if (err) {
          console.error(err);
        }
        tempId = null;
      });
  }

  api.get("/api/pick", async (req, res) => {
    const type = req.query.type;
    const properties = type === "file" ? ["openFile"] : ["openDirectory"];
    const result = await dialog.showOpenDialog({
      title: "Pick a file",
      properties,
      filters: [{ name: "All Files", extensions: ["*"] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return res.status(400).json({ error: "No file selected" });
    }

    return res.json({ filePath: result.filePaths[0] });
  });

  api.post("/api/save-project", async (req, res) => {
    const { project, modeler, java, nativeTemplate, id } = req.body;
    if (!project)
      return res.status(400).send({ message: "project is required" });
    if (!modeler)
      return res.status(400).send({ message: "modeler is required" });
    if (!java) return res.status(400).send({ message: "java is required" });
    if (!nativeTemplate)
      return res.status(400).send({ message: "nativeTemplate is required" });

    const meta = [{ project, modeler, java, nativeTemplate, id }];

    const prevMetaJson = getMeta();
    const projectExists =
      prevMetaJson?.filter((prevProject) => prevProject.id === id).length > 0;
    if (projectExists) {
      fs.writeFile(
        META_PATH,
        JSON.stringify(
          prevMetaJson.map((prevProject) => {
            if (prevProject.id === id) {
              return { project, modeler, java, nativeTemplate, id };
            }
            return prevProject;
          })
        ),
        () => {
          res.send({ message: "Success" });
        }
      );
      return;
    }

    try {
      fs.writeFile(
        META_PATH,
        JSON.stringify([...prevMetaJson, ...meta]),
        () => {
          return res.send({ message: "Success" });
        }
      );
    } catch {
      return res.status(500).send({ message: "somthing went wrong" });
    }
  });

  api.delete("/api/project", (req, res) => {
    const { id } = req.body;
    const prevMetaJson = getMeta();
    const meta = prevMetaJson?.filter((prevProject) => prevProject.id !== id);
    try {
      fs.writeFile(META_PATH, JSON.stringify(meta), () => {
        return res.send({ message: "Success" });
      });
    } catch {
      return res.status(500).send({ message: "somthing went wrong" });
    }
  });

  api.get("/api/projects", (req, res) => {
    try {
      const data = getMeta();

      res.json({ data: data });
    } catch {
      res.json({ data: [] });
    }
  });

  api.get("/api/java-info", (_, res) => {
    getJavaInfo((info) => {
      return res.send({ data: info });
    });
  });

  api.post("/api/create-build", (req, res) => {
    tempId = Math.random() * 10;
    const { project, modeler, java, nativeTemplate } = req.body;
    const name = project.split("\\").at(-1);

    const buildCommand = [
      exePath,
      "bundle",
      "--project-name",
      `"${name}"`,
      "--output-path",
      `"${nativeTemplate}"`,
      "--project-path",
      `"${project}"`,
      "--java-home",
      `"${java}"`,
      "--mxbuild-path",
      `"${modeler}\\mxbuild.exe"`,
    ].join(" ");

    try {
      childProcess = spawn(buildCommand, {
        shell: true,
      });

      stdListner(tempId, childProcess, (code) => {
        if (code !== 0) {
          // clearTempFile();
          return res.send({ message: "somthing went wrong", code, exePath });
        }
        console.warn(`child process exited with code ${code}`);
        const nativeTemplateFiles = fs.readdirSync(nativeTemplate);

        const androidFile = nativeTemplateFiles.filter((file) =>
          file.includes("Android")
        )[0];
        const iosFile = nativeTemplateFiles.filter((file) =>
          file.includes("iOS")
        )[0];

        const childProcess = spawn("cmd.exe", [
          "/c",
          scriptPath,
          `${nativeTemplate}`,
          `${androidFile}`,
          `${iosFile}`,
        ]);

        stdListner(tempId, childProcess, (code) => {
          if (code === 0) {
            fs.unlinkSync(path.join(nativeTemplate, androidFile));
            fs.unlinkSync(path.join(nativeTemplate, iosFile));

            res.send({ message: "success" });
            console.log("✅ Batch script completed successfully.");
          } else {
            console.error(`❌ Batch script exited with code ${code}`);
            clearTempFile();
            return res.status(500).send({
              message: "somthing went wrong unpacking files",
            });
          }
        });
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "fail" });
    }
  });

  api.post("/api/stop-build", (req, res) => {
    const killtask = spawn("taskkill", ["/PID", childProcess.pid, "/T", "/F"]);

    clearTempFile();

    killtask.on("close", (code) => {
      if (code === 0) return res.send({ message: "sucess" });
      return res.status(500).send({ message: "somthing went wrong" });
    });
  });

  api.get("/api/build-stream", async (req, res) => {
    const fileExists = await new Promise((resolve, reject) => {
      try {
        let tries = 0;
        function getFileExists() {
          let exists = fs.existsSync(BASE_PATH + `${tempId}.txt`);
          if (exists || tries > 3) {
            return resolve(exists);
          }
          tries += 1;
          setTimeout(() => {
            getFileExists();
          }, 1000);
        }
        getFileExists();
      } catch (err) {
        reject(err);
      }
    });

    if (!fileExists) {
      return res.status(500).send({
        message: "somthing went wring in file stream",
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const readableStream = createReadStream(BASE_PATH + `${tempId}.txt`, {
      start: 0,
    });

    readableStream.on("data", (data) => {
      data
        ?.toString()
        ?.split("\n")
        ?.forEach((log) => {
          res.write("event: message\n");
          res.write(`data: ${log} \n\n`);
        });

      res.write("event: message\n");
      res.write(`data: ${data} \n\n`);
    });
    readableStream.on("end", (data) => {
      res.end();
    });
  });

  api.listen(3000, () => {
    console.log("API server running on http://localhost:3000");
  });
}
