import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";

export default function ProjectActions({
  createBuild,
  isBuilding,
  variables,
  activeProject,
}) {
  const abortController = useRef(new AbortController());
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["projects", activeProject],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/projects");
      const data = await res.json();
      console.log(activeProject, data);
      if (!activeProject) return data.data;
      return data.data.filter(
        (data) =>
          data.project.split("\\").at(-1) === activeProject.split("\\").at(-1)
      );
    },
  });

  const { data: javaMeta } = useQuery({
    queryKey: ["java_meta"],
    queryFn: async () => {
      await fetch("http://localhost:3000/api/java-info");
      return true;
    },
  });

  const { mutate: deleteProject } = useMutation({
    mutationFn: async ({ project }) => {
      console.log(project);
      return fetch("http://localhost:3000/api/project", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
    },
    onSuccess: () => refetch(),
  });

  if (isLoading) return <div>loading ...</div>;

  return (
    <div>
      <div className="cta-contaienr">
        <h4>Create Mendix Native App bundles</h4>
        <button
          onClick={() => navigate("/add-project")}
          className="action-button"
        >
          add project
        </button>
      </div>
      {data.map((meta, index) => (
        <div className="project" key={index}>
          {meta.project.split("\\").at(-1)}
          <div className="action-container">
            <button
              className={`build-btn${isBuilding ? " build-disabled" : ""} me-1`}
              onClick={() => {
                if (isBuilding) return;
                createBuild({ meta, abortController });
              }}
            >
              {isBuilding && variables.meta.project === meta.project ? (
                <span class="loader"></span>
              ) : (
                "Build"
              )}
            </button>

            <button
              className={`action-button ${
                isBuilding && variables.meta.project === meta.project
                  ? "shown me-1"
                  : "hidden"
              }`}
              onClick={() => {
                void fetch("http://localhost:3000/api/stop-build", {
                  method: "POST",
                });
              }}
            >
              Stop
            </button>
            <button
              className={`action-button ${
                isBuilding && variables.meta.project === meta.project
                  ? "shown me-1"
                  : "hidden"
              }`}
              onClick={() => {
                navigate("/build-output");
              }}
            >
              output
            </button>

            <button
              className="action-button me-1"
              onClick={() =>
                navigate("/add-project", {
                  state: meta,
                })
              }
            >
              Edit
            </button>
            <button
              className="remove-button"
              onClick={() => {
                deleteProject({ project: meta.project });
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
