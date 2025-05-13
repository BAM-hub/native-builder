import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AddProjectForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    project: "",
    modeler: "",
    java: "",
    nativeTemplate: "",
  });

  const { mutate: saveProject } = useMutation({
    mutationFn: async () => {
      await fetch("http://localhost:3000/api/save-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      refetch();
    },
  });

  function handlePathChange(name) {
    fetch("http://localhost:3000/api/pick")
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setFormData({
          ...formData,
          [name]: data.filePath,
        });
      });
  }

  return (
    <div className="">
      <button onClick={() => navigate("/")}>close</button>
      <div>
        <p>{formData.project || "Empty"} </p>
        <button onClick={() => handlePathChange("project")}>
          Select Project Path
        </button>
      </div>
      <div>
        <p>{formData.modeler || "Empty"}</p>
        <button onClick={() => handlePathChange("modeler")}>
          Select modeler Path
        </button>
      </div>
      <div>
        <p>{formData.java || "Empty"}</p>
        <button onClick={() => handlePathChange("java")}>
          Select Java Path
        </button>
      </div>
      <div>
        <p>{formData.nativeTemplate || "Empty"}</p>
        <button onClick={() => handlePathChange("nativeTemplate")}>
          Native Template Path
        </button>
      </div>
      <button onClick={() => saveProject()}>save</button>
    </div>
  );
};

export default AddProjectForm;
