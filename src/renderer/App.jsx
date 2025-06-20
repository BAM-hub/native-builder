import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import AddProjectForm from "./AddProjectForm";
import BuildOutput from "./BuildOutput";
import ProjectActions from "./ProjectActions";
import { useEffect, useState } from "react";

export default function App() {
  const [activeProject, setActiveProject] = useState(null);
  useEffect(() => {
    window.api?.onData((data) => {
      console.log("Received props:", data);
      setActiveProject(data.id);
      // Set in state or handle accordingly
    });
  }, []);
  const {
    mutate: createBuild,
    isPending: isBuilding,
    variables,
  } = useMutation({
    mutationFn: async ({ meta, abortController }) => {
      console.log(meta, abortController);
      return fetch("http://localhost:3000/api/create-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
        signal: abortController.current.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
        });
    },
  });
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <ProjectActions
              activeProject={activeProject}
              createBuild={createBuild}
              isBuilding={isBuilding}
              variables={variables}
            />
          }
        />
        <Route path="/add-project" element={<AddProjectForm />} />
        <Route path="/build-output" element={<BuildOutput />} />
      </Routes>
    </Router>
  );
}
