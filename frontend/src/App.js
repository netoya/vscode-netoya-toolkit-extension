import React, { useEffect, useState } from "react";
import ReactSelect from "react-select";
import AsyncSelect from "react-select/async";

const callAction = async (name, params) => {
  const resp = await fetch("http://localhost:4123/" + name, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(params),
  });
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(json);
  }

  return json;
};

const callProjects = () => {
  return callAction("workspaces");
};

const callTools = (params) => {
  return callAction("tools", params);
};

const callTool = (params) => {
  return callAction("tool", params);
};

const ProjectButton = ({ project, ...props }) => {
  return (
    <button
      {...props}
      className="bg-blue-500 active:bg-blue-600 text-white py-1 text-left px-2"
    >
      Project {project.path}
    </button>
  );
};

const ToolButton = ({ tool, ...props }) => {
  return (
    <button
      {...props}
      className="bg-blue-500 active:bg-blue-600 text-white py-1 text-left px-2"
    >
      Tool {tool.name}
    </button>
  );
};

export default function App() {
  const [projects, setProjects] = useState([]);
  const [tools, setTools] = useState([]);

  const [projectSelected, setProjectSelected] = useState({});
  const [toolSelected, setToolSelected] = useState({});
  const [toolInfo, setToolInfo] = useState({});
  const [toolData, setToolData] = useState({});

  useEffect(() => {
    callProjects()
      .then((resp) => {
        setProjects(resp.workspaces);
      })
      .catch((error) => console.log(error));
  }, []);

  useEffect(() => {
    setTools([]);
    setToolSelected({});
    if (projectSelected.path) {
      callTools({ workspace: projectSelected.path })
        .then((resp) => {
          setTools(resp.tools);
        })
        .catch((error) => console.log(error));
    }
  }, [projectSelected.path]);

  useEffect(() => {
    setToolInfo({});
    if (toolSelected.path) {
      callTool({ tool: toolSelected.path })
        .then((resp) => {
          setToolInfo(resp.tool);
        })
        .catch((error) => console.log(error));
    } else {
      setToolData({});
    }
  }, [toolSelected.path]);

  const renderProjects = () => {
    return (
      <div className="p-2 flex flex-col gap-2 ">
        <div className="text-gray-600">Toolkit&nbsp;</div>
        <div className="text-gray-600">Projects</div>
        {projects.map((project) => (
          <ProjectButton
            onClick={() => setProjectSelected(project)}
            key={project}
            project={project}
          />
        ))}
      </div>
    );
  };

  const renderTools = () => {
    return (
      <div className="p-2 flex flex-col gap-2 ">
        <div onClick={() => setProjectSelected({})}>
          {projectSelected.path}&nbsp;
        </div>
        <div className="text-gray-600">Tools</div>
        {tools.map((tool) => (
          <ToolButton
            onClick={() => setToolSelected(tool)}
            key={tool}
            tool={tool}
          />
        ))}
      </div>
    );
  };

  const promiseOptions = (param) => async (inputValue) =>
    callAction("run", {
      tool: toolSelected.path,
      run: param.source,
      data: { inputValue },
    });

  const renderParam = (param) => {
    if (param.type == "select") {
      if (param.source) {
        return (
          <AsyncSelect
            onChange={(newValue) => {
              setToolData((current) => ({
                ...current,
                [param.name]: newValue.value,
              }));
            }}
            cacheOptions
            defaultOptions
            loadOptions={promiseOptions(param)}
          />
        );
      }
      return (
        <ReactSelect
          required={true}
          onChange={(newValue) => {
            setToolData((current) => ({
              ...current,
              [param.name]: newValue.value,
            }));
          }}
          options={param.options || []}
        />
      );
    }

    return (
      <input
        onChange={({ target }) =>
          setToolData((current) => ({ ...current, [param.name]: target.value }))
        }
        className="rounded h-9 border border-slate-300 w-full px-3 flex items-center focus:outline-blue-500"
        type="text"
      />
    );
  };

  const apply = (event) => {
    event.preventDefault();

    callAction("apply", {
      tool: toolSelected.path,
      data: toolData,
    });
  };

  const renderTool = () => {
    let { params = [] } = toolInfo?.form || {};
    return (
      <form onSubmit={apply} className="p-2 flex flex-col gap-2 ">
        <div onClick={() => setToolSelected({})}>{toolInfo.name}&nbsp;</div>
        <div className="text-gray-600">Form</div>
        {params.map((param, idx) => (
          <div key={idx} className="">
            <div className="">{param.title}</div>
            {renderParam(param)}
          </div>
        ))}

        <button className="flex justify-center bg-blue-500 active:bg-blue-600 text-white py-1 text-left px-2">
          Aplicar
        </button>
      </form>
    );
  };

  return (
    <div className="h-full bg-gray-100  text-sm">
      {!projectSelected?.path && renderProjects()}
      {projectSelected?.path && (
        <>
          {!toolSelected?.path && renderTools()}
          {toolSelected?.path && renderTool()}
        </>
      )}
    </div>
  );
}
