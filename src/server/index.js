import { exec, spawn } from "child_process";
import { app, dialog } from "electron";
import EventEmitter from "node:events";
import express from "express";
import fs from "fs";
import path from "path";

// const eventemitter = new EventEmitter();

const META_PATH = path.join(app.getPath("userData"), "meta.json");
console.log(META_PATH);
const exePath = path.join(
  app.isPackaged ? process.resourcesPath : __dirname,
  "bin",
  "native-builder.exe"
);
const scriptPath = path.join(
  app.isPackaged ? process.resourcesPath : __dirname,
  "bin",
  "movebuild.bat"
);

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

export function createServer() {
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

  api.get("/api/pick", async (req, res) => {
    const result = await dialog.showOpenDialog({
      title: "Pick a file",
      properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return res.status(400).json({ error: "No file selected" });
    }

    return res.json({ filePath: result.filePaths[0] });
  });

  api.post("/api/save-project", async (req, res) => {
    const { project, modeler, java, nativeTemplate } = req.body;
    const meta = [{ project, modeler, java, nativeTemplate }];

    const prevMetaJson = getMeta();

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
      `"${project}\\Tajawob.mpr"`,
      "--java-home",
      `"${java}"`, // Quotes around paths
      "--mxbuild-path",
      `"${modeler}\\mxbuild.exe"`,
    ].join(" ");

    try {
      const nativeBuilder = spawn(buildCommand, {
        shell: true,
      });

      // eventemitter.emit("start", nativeBuilder);
      nativeBuilder.stdout.pipe(process.stdout);

      nativeBuilder.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
      });

      nativeBuilder.stderr.on("data", (data) => {
        console.warn(`stdout data: ${data}`);

        // return res.json({ message: "success" });
      });

      nativeBuilder.on("close", (code) => {
        console.warn(`child process exited with code ${code}`);
        const nativeTemplateFiles = fs.readdirSync(nativeTemplate);

        const androidFile = nativeTemplateFiles.filter((file) =>
          file.includes("Android")
        )[0];
        const iosFile = nativeTemplateFiles.filter((file) =>
          file.includes("iOS")
        )[0];

        const bat = spawn("cmd.exe", [
          "/c",
          scriptPath,
          `${nativeTemplate}`,
          `${androidFile}`,
          `${iosFile}`,
        ]);
        // eventemitter.emit("start", nativeBuilder);

        bat.stdout.on("data", (data) => {
          console.log(`[stdout] ${data}`);
        });

        bat.stderr.on("data", (data) => {
          console.error(`[stderr] ${data}`);
        });

        bat.on("close", (code) => {
          if (code === 0) {
            fs.unlinkSync(path.join(nativeTemplate, androidFile));
            fs.unlinkSync(path.join(nativeTemplate, iosFile));

            res.send({ message: "success" });
            console.log("✅ Batch script completed successfully.");
          } else {
            res.send({ message: "fail" });

            console.error(`❌ Batch script exited with code ${code}`);
          }
        });
      });
      // eventemitter.emit("end");
    } catch (err) {
      console.error(err);
      // eventemitter.emit("end");
      return res.status(500).json({ message: "fail" });
    }
  });

  // api.get("/api/read-stream", (req, res) => {
  //   let localChildProcess = null;
  //   res.set({
  //     "Content-Type": "text/event-stream",
  //     "Cache-Control": "no-cache",
  //     Connection: "keep-alive",
  //   });
  //   eventemitter.on("start", (childProcess) => {
  //     if (localChildProcess) {
  //       localChildProcess.off("start");
  //       bat.stdout.off("data");
  //       bat.stderr.off("data");
  //     }
  //     localChildProcess = childProcess;
  //     bat.stdout.on("data", (data) => {
  //       console.log(`[stdout] ${data}`);
  //       res.write(`${data.toString().replace(/\r?\n/g, "\ndata: ")}\n\n`);
  //     });

  //     bat.stderr.on("data", (data) => {
  //       res.write(`${data.toString().replace(/\r?\n/g, "\ndata: ")}\n\n`);
  //     });
  //   });
  //   eventemitter.on("end", () => {
  //     localChildProcess.off("start");
  //     bat.stdout.off("data");
  //     bat.stderr.off("data");
  //     eventemitter.off("end");
  //     res.end();
  //   });
  // });

  api.listen(3000, () => {
    console.log("API server running on http://localhost:3000");
  });
}
