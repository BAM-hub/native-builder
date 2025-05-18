import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BuildOutput = () => {
  const navigate = useNavigate();
  const [output, setOutput] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let eventSource;
    function getDataStream() {
      eventSource = new EventSource("http://localhost:3000/api/build-stream");
      eventSource.addEventListener(
        "open",
        (ev) => {
          console.log(ev.data);
          setOutput((prev) => prev + ev.data);
        },
        {
          signal: controller.signal,
        }
      );
      eventSource.addEventListener(
        "message",
        (ev) => {
          console.log(ev.data);
          setOutput((prev) => prev + "\n" + ev.data);
        },
        {
          signal: controller.signal,
        }
      );
    }
    getDataStream();

    return () => {
      console.log("unmounted");
      eventSource?.close();
      controller.abort();
    };
  }, []);

  return (
    <div>
      <div className="cta-contaienr">
        <button
          className="action-button"
          onClick={() => {
            navigate("/");
          }}
        >
          Back
        </button>
      </div>

      <pre>{output}</pre>
    </div>
  );
};

export default BuildOutput;
