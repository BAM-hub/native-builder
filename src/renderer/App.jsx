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

function Hello() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/projects");
      const data = await res.json();
      return data.data;
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (meta) =>
      fetch("http://localhost:3000/api/create-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
        }),
  });

  // const [output, setOutput] = useState("");

  // useEffect(() => {
  //   const eventSource = new EventSource("http://localhost:3001/stream");

  //   eventSource.onmessage = (event) => {
  //     setOutput((prev) => prev + event.data + "\n");
  //   };

  //   eventSource.onerror = (err) => {
  //     console.error("SSE error", err);
  //     eventSource.close();
  //   };

  //   return () => {
  //     eventSource.close();
  //   };
  // }, []);

  const { data: javaMeta } = useQuery({
    queryKey: ["java_meta"],
    queryFn: async () => {
      await fetch("http://localhost:3000/api/java-info");
      return true;
    },
  });

  if (isLoading) return <div>loading ...</div>;

  return (
    <div>
      {data.map((meta, index) => (
        <div className="project" key={index}>
          {meta.project.split("\\").at(-1)}
          <button
            className="build-btn"
            onClick={() => {
              mutate(meta);
            }}
          >
            {isPending ? <span class="loader"></span> : "Build"}
          </button>
        </div>
      ))}
      <button onClick={() => navigate("/add-project")}>add project</button>
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
