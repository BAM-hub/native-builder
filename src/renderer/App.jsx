import {
  MemoryRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import AddProjectForm from "./AddProjectForm";
import { useRef } from "react";

function Hello() {
  const abortController = useRef(new AbortController());
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/projects");
      const data = await res.json();
      return data.data;
    },
  });

  const { mutate, isPending, variables } = useMutation({
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
              className={`build-btn${isPending ? " build-disabled" : ""} me-1`}
              onClick={() => {
                if (isPending) return;
                mutate({ meta, abortController });
              }}
            >
              {isPending && variables.meta.project === meta.project ? (
                <span class="loader"></span>
              ) : (
                "Build"
              )}
            </button>

            <button
              className={`action-button ${
                isPending && variables.meta.project === meta.project
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

const queryClient = new QueryClient();
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Hello />} />
          <Route path="/add-project" element={<AddProjectForm />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
