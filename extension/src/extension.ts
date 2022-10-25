import * as vscode from "vscode";

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

const port = 4123;
const apiUrl = `http://localhost:${port}`;
// const frontUrl = `http://localhost:${port}`;
const frontUrl = `http://localhost:3000`;

export function activate(context: vscode.ExtensionContext) {
  const provider = new ColorsViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ColorsViewProvider.viewType,
      provider
    )
  );

  provider.connectApi(app);

  app.post("/workspaces", (req: any, res: any) => {
    let workspaces = [...(vscode.workspace.workspaceFolders || [])];

    let data = workspaces.map((ws) => ({ path: ws.uri.path }));

    res.json({ workspaces: data });
  });

  app.post("/tools", async (req: any, res: any) => {
    let workspace = req.body.workspace;
    if (!workspace) {
      res.status(404).json({ error: "No workspace param" });
      return;
    }

    let workspaces = [...(vscode.workspace.workspaceFolders || [])];

    let project = workspaces.find((ws) => ws.uri.path == workspace);

    if (!project) {
      res.status(404).json({ error: "No workspace opened" });
      return;
    }

    let tools: any[] = [];
    try {
      let configs = await vscode.workspace.findFiles("_ntoolkit/**/tool.json");

      for await (const c of configs) {
        try {
          let { path } = c;

          let config = await vscode.workspace.fs.readFile(
            vscode.Uri.file(path)
          );
          let { name, description } = JSON.parse(config.toString());

          path = path.split("/");
          path.pop();
          path = path.join("/");

          // TODO: find win fix
          path = path.replace(
            project.uri.path.toLocaleLowerCase(),
            project.uri.path
          );

          tools.push({
            name,
            description,
            path,
          });
        } catch (error) {}
      }
    } catch (error) {}

    res.json({ tools });
  });

  app.post("/tool", async (req: any, res: any) => {
    let toolPath = req.body.tool;

    if (!toolPath) {
      res.status(404).json({ error: "No tool param" });
      return;
    }

    let workspace = toolPath.split("_ntoolkit")[0];
    workspace = workspace.substr(0, workspace.length - 1);

    let workspaces = [...(vscode.workspace.workspaceFolders || [])];

    let project = workspaces.find(
      (ws) => ws.uri.path.toLowerCase() == workspace.toLowerCase()
    );

    if (!project) {
      res.status(404).json({ error: "No workspace opened" });
      return;
    }

    let data: any = {};

    try {
      let config = await vscode.workspace.fs.readFile(
        vscode.Uri.file(toolPath + "/tool.json")
      );

      data = JSON.parse(config.toString());

      let toolJsPath = toolPath + "/tool.js";

      toolJsPath = toolJsPath.replace(project.uri.path, project.uri.fsPath);

      // import tool
      const tool = require(toolJsPath);
      // no-cache
      delete require.cache[require.resolve(toolJsPath)];

      res.json({ tool: { ...data, path: toolPath, form: tool.form() } });
    } catch (error) {
      res.status(404).json({ error: "Tool error", message: error });
    }
  });

  app.post("/run", async (req: any, res: any) => {
    let toolPath = req.body.tool;
    let runData = req.body.data;
    let run = req.body.run;

    if (!toolPath) {
      res.status(404).json({ error: "No tool param" });
      return;
    }

    let workspace = toolPath.split("_ntoolkit")[0];
    workspace = workspace.substr(0, workspace.length - 1);

    let workspaces = [...(vscode.workspace.workspaceFolders || [])];

    let project = workspaces.find(
      (ws) => ws.uri.path.toLowerCase() == workspace.toLowerCase()
    );

    if (!project) {
      res.status(404).json({ error: "No workspace opened" });
      return;
    }

    try {
      let config = await vscode.workspace.fs.readFile(
        vscode.Uri.file(toolPath + "/tool.json")
      );

      let data = JSON.parse(config.toString());

      let toolJsPath = toolPath + "/tool.js";

      toolJsPath = toolJsPath.replace(project.uri.path, project.uri.fsPath);

      // import tool
      const tool = require(toolJsPath);
      // no-cache
      delete require.cache[require.resolve(toolJsPath)];

      let result = await tool[run](runData);
      res.json(result);
      return;
    } catch (error) {
      res.status(404).json({ error: "Tool error", message: error });
    }
  });

  app.post("/apply", async (req: any, res: any) => {
    let toolPath = req.body.tool;
    let toolData = req.body.data;

    if (!toolPath) {
      res.status(404).json({ error: "No tool param" });
      return;
    }

    let workspace = toolPath.split("_ntoolkit")[0];
    workspace = workspace.substr(0, workspace.length - 1);

    let workspaces = [...(vscode.workspace.workspaceFolders || [])];

    let project = workspaces.find(
      (ws) => ws.uri.path.toLowerCase() == workspace.toLowerCase()
    );

    if (!project) {
      res.status(404).json({ error: "No workspace opened" });
      return;
    }

    try {
      let config = await vscode.workspace.fs.readFile(
        vscode.Uri.file(toolPath + "/tool.json")
      );

      let data = JSON.parse(config.toString());

      let toolJsPath = toolPath + "/tool.js";

      toolJsPath = toolJsPath.replace(project.uri.path, project.uri.fsPath);

      // import tool
      const tool = require(toolJsPath);
      // no-cache
      delete require.cache[require.resolve(toolJsPath)];

      await tool.apply(toolData);
      res.json({ apply: true });
      return;
    } catch (error) {
      res.status(404).json({ error: "Tool error", message: error });
    }
  });

  app.get("/", (req: any, res: any) => {
    res.send(`<html>
    <head>
    <script>
    const callAction = async (name, params) => {
      const resp = await fetch('${apiUrl}/' + name);
      const json = await resp.json();

      return json
    }

    const addColor = async ()=>{
      const data = await callAction('addColor')

      console.log(JSON.stringify(data))
    }
    </script>
    </head>
    <body>
    <button onclick="addColor()">AddColor</button>
    
    </body>
    </html>`);
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}

class ColorsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "netoyaToolkit.colorsView";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "colorSelected": {
          vscode.window.activeTextEditor?.insertSnippet(
            new vscode.SnippetString(`#${data.value}`)
          );
          break;
        }
      }
    });
  }

  public connectApi(app: any) {
    app.get("/addColor", (req: any, res: any) => {
      this.addColor();
      res.json({ message: "Hello World!" });
    });

    app.get("/clearColors", (req: any, res: any) => {
      this.clearColors();
      res.send("Hello World!");
    });
  }

  public addColor() {
    if (this._view) {
      this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
      this._view.webview.postMessage({ type: "addColor" });
    }
  }

  public clearColors() {
    if (this._view) {
      this._view.webview.postMessage({ type: "clearColors" });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				-->

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          html, body{
            margin:0px;
            padding:0px;
            height:100%;
            overflow:hidden;
          }

          iframe{
            width:100%;
            height:100%;
          }
        </style>
        <title>Netoya Toolkit</title>
			</head>
			<body>
      <iframe frameBorder="0" src="${frontUrl}" />
			</body>
			</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
