import { useMutation } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const AddProjectForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(
    location.state || {
      id: nanoid(),
      project: "",
      modeler: "",
      java: "",
      nativeTemplate: "",
    }
  );
  const [errors, setErrors] = useState({
    project: false,
    modeler: false,
    java: false,
    nativeTemplate: false,
  });

  const { mutate: saveProject } = useMutation({
    mutationFn: async () => {
      await fetch("http://localhost:3000/api/save-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
    },
    onSuccess: () => {
      navigate("/");
      refetch();
    },
  });

  function handlePathChange(name, type) {
    fetch("http://localhost:3000/api/pick?type=" + type)
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          ...formData,
          [name]: data.filePath,
        });
      });
  }

  return (
    <div className="">
      <div
        onClick={() => handlePathChange("project", "file")}
        className={`location-input ${errors.project ? "invalid" : ""}`}
      >
        <button>Select Project Path</button>
        <p>{formData.project || "Empty"} </p>
      </div>
      <div
        onClick={() => handlePathChange("modeler", "folder")}
        className={`location-input ${errors.project ? "invalid" : ""}`}
      >
        <button>Select modeler Path</button>
        <p>{formData.modeler || "Empty"}</p>
      </div>
      <div
        onClick={() => handlePathChange("java", "folder")}
        className={`location-input ${errors.project ? "invalid" : ""}`}
      >
        <button>Select Java Path</button>
        <p>{formData.java || "Empty"}</p>
      </div>
      <div
        onClick={() => handlePathChange("nativeTemplate", "folder")}
        className={`location-input ${errors.project ? "invalid" : ""}`}
      >
        <button>Native Template Path</button>
        <p>{formData.nativeTemplate || "Empty"}</p>
      </div>
      <div className="form-footer-actions">
        <button onClick={() => navigate("/")} className="action-button">
          Back
        </button>
        <button
          onClick={() => {
            const errors = Object.keys(formData).reduce((prev, curr) => {
              const value = formData[curr];
              const prevObje =
                typeof prev === "object"
                  ? prev
                  : {
                      [prev]: !formData[prev],
                    };
              return {
                ...prevObje,
                [curr]: !value,
              };
            });

            let valid = Object.values(errors).some((value) => !value);
            if (valid) {
              saveProject();
            } else {
              setErrors(errors);
            }
          }}
          className="build-btn"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default AddProjectForm;
