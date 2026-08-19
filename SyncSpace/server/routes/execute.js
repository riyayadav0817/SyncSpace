const express = require("express");
const router = express.Router();

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

/* =====================================================
   CONFIG
===================================================== */

const EXECUTION_TIMEOUT = 10000;
const MAX_CODE_SIZE = 100 * 1024;
const MAX_OUTPUT_SIZE = 200000;

/* =====================================================
   HELPERS
===================================================== */

const createExecutionDirectory = () => {
  const baseDirectory = path.join(
    os.tmpdir(),
    "syncspace-execution"
  );

  fs.mkdirSync(baseDirectory, {
    recursive: true,
  });

  const executionId = crypto.randomUUID();

  const executionDirectory = path.join(
    baseDirectory,
    executionId
  );

  fs.mkdirSync(executionDirectory, {
    recursive: true,
  });

  return executionDirectory;
};

const cleanupDirectory = (directory) => {
  try {
    if (
      directory &&
      fs.existsSync(directory)
    ) {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  } catch (error) {
    console.error(
      "⚠️ Cleanup error:",
      error.message
    );
  }
};

/* =====================================================
   RUN PROCESS
===================================================== */

const runProcess = (
  command,
  args = [],
  options = {}
) => {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let finished = false;

    const timeout =
      options.timeout ||
      EXECUTION_TIMEOUT;

    let child;

    try {
      child = spawn(
        command,
        args,
        {
          cwd: options.cwd,
          windowsHide: true,
          shell: false,

          env: {
            ...process.env,
            ...(options.env || {}),
          },
        }
      );
    } catch (error) {
      resolve({
        success: false,
        timedOut: false,
        code: null,
        stdout,
        stderr: error.message,
      });

      return;
    }

    const timer = setTimeout(() => {
      if (finished) {
        return;
      }

      finished = true;

      try {
        child.kill("SIGKILL");
      } catch {}

      resolve({
        success: false,
        timedOut: true,
        code: null,
        stdout,
        stderr:
          stderr ||
          "Execution timed out.",
      });
    }, timeout);

    child.stdout?.on(
      "data",
      (data) => {
        if (
          stdout.length >=
          MAX_OUTPUT_SIZE
        ) {
          return;
        }

        stdout += data.toString();

        if (
          stdout.length >
          MAX_OUTPUT_SIZE
        ) {
          stdout =
            stdout.slice(
              0,
              MAX_OUTPUT_SIZE
            );
        }
      }
    );

    child.stderr?.on(
      "data",
      (data) => {
        if (
          stderr.length >=
          MAX_OUTPUT_SIZE
        ) {
          return;
        }

        stderr += data.toString();

        if (
          stderr.length >
          MAX_OUTPUT_SIZE
        ) {
          stderr =
            stderr.slice(
              0,
              MAX_OUTPUT_SIZE
            );
        }
      }
    );

    child.on(
      "error",
      (error) => {
        if (finished) {
          return;
        }

        finished = true;

        clearTimeout(timer);

        let message;

        if (
          error.code === "ENOENT"
        ) {
          message =
            `Command not found: ${command}`;
        } else {
          message =
            error.message;
        }

        resolve({
          success: false,
          timedOut: false,
          code: null,
          stdout,
          stderr: message,
        });
      }
    );

    child.on(
      "close",
      (code) => {
        if (finished) {
          return;
        }

        finished = true;

        clearTimeout(timer);

        resolve({
          success:
            code === 0,
          timedOut: false,
          code,
          stdout,
          stderr,
        });
      }
    );
  });
};

/* =====================================================
   LANGUAGE NORMALIZATION
===================================================== */

const normalizeLanguage = (
  language
) => {
  const value =
    String(language || "")
      .trim()
      .toLowerCase();

  const aliases = {
    js: "javascript",
    node: "javascript",
    nodejs: "javascript",

    py: "python",
    python3: "python",

    cxx: "cpp",
    "c++": "cpp",

    cs: "csharp",
    "c#": "csharp",
    "c-sharp": "csharp",

    golang: "go",

    rs: "rust",

    rb: "ruby",

    htm: "html",

    yml: "yaml",
  };

  return (
    aliases[value] ||
    value
  );
};

/* =====================================================
   JAVASCRIPT
===================================================== */

const executeJavaScript = async (
  code,
  directory
) => {
  const filePath =
    path.join(
      directory,
      "main.js"
    );

  fs.writeFileSync(
    filePath,
    code,
    "utf8"
  );

  return runProcess(
    process.execPath,
    [filePath],
    {
      cwd: directory,
      timeout:
        EXECUTION_TIMEOUT,
    }
  );
};

/* =====================================================
   PYTHON
===================================================== */

const executePython = async (
  code,
  directory
) => {
  const filePath =
    path.join(
      directory,
      "main.py"
    );

  fs.writeFileSync(
    filePath,
    code,
    "utf8"
  );

  let result =
    await runProcess(
      "python",
      [filePath],
      {
        cwd: directory,
        timeout:
          EXECUTION_TIMEOUT,
      }
    );

  /* -----------------------------------------------
     Windows fallback
  ----------------------------------------------- */

  if (
    !result.success &&
    result.stderr?.includes(
      "Command not found"
    )
  ) {
    result =
      await runProcess(
        "py",
        [filePath],
        {
          cwd: directory,
          timeout:
            EXECUTION_TIMEOUT,
        }
      );
  }

  return result;
};

/* =====================================================
   C
===================================================== */

const executeC = async (
  code,
  directory
) => {
  const sourcePath =
    path.join(
      directory,
      "main.c"
    );

  const executablePath =
    path.join(
      directory,
      "main.exe"
    );

  fs.writeFileSync(
    sourcePath,
    code,
    "utf8"
  );

  const compileResult =
    await runProcess(
      "gcc",
      [
        sourcePath,
        "-O2",
        "-o",
        executablePath,
      ],
      {
        cwd: directory,
        timeout:
          EXECUTION_TIMEOUT,
      }
    );

  if (
    !compileResult.success
  ) {
    return {
      ...compileResult,
      phase: "compile",
    };
  }

  return {
    ...(
      await runProcess(
        executablePath,
        [],
        {
          cwd: directory,
          timeout:
            EXECUTION_TIMEOUT,
        }
      )
    ),
    phase: "run",
  };
};

/* =====================================================
   C++
===================================================== */

const executeCpp = async (
  code,
  directory
) => {
  const sourcePath =
    path.join(
      directory,
      "main.cpp"
    );

  const executablePath =
    path.join(
      directory,
      "main.exe"
    );

  fs.writeFileSync(
    sourcePath,
    code,
    "utf8"
  );

  const compileResult =
    await runProcess(
      "g++",
      [
        sourcePath,
        "-std=c++17",
        "-O2",
        "-o",
        executablePath,
      ],
      {
        cwd: directory,
        timeout:
          EXECUTION_TIMEOUT,
      }
    );

  if (
    !compileResult.success
  ) {
    return {
      ...compileResult,
      phase: "compile",
    };
  }

  return {
    ...(
      await runProcess(
        executablePath,
        [],
        {
          cwd: directory,
          timeout:
            EXECUTION_TIMEOUT,
        }
      )
    ),
    phase: "run",
  };
};

/* =====================================================
   JAVA
===================================================== */

const executeJava = async (
  code,
  directory
) => {
  const sourcePath =
    path.join(
      directory,
      "Main.java"
    );

  fs.writeFileSync(
    sourcePath,
    code,
    "utf8"
  );

  const compileResult =
    await runProcess(
      "javac",
      [sourcePath],
      {
        cwd: directory,
        timeout:
          EXECUTION_TIMEOUT,
      }
    );

  if (
    !compileResult.success
  ) {
    return {
      ...compileResult,
      phase: "compile",
    };
  }

  const runResult =
    await runProcess(
      "java",
      [
        "-cp",
        directory,
        "Main",
      ],
      {
        cwd: directory,
        timeout:
          EXECUTION_TIMEOUT,
      }
    );

  return {
    ...runResult,
    phase: "run",
  };
};

/* =====================================================
   C#
===================================================== */

const executeCSharp = async (
  code,
  directory
) => {
  const projectDirectory =
    path.join(
      directory,
      "CSharpApp"
    );

  fs.mkdirSync(
    projectDirectory,
    {
      recursive: true,
    }
  );

  const projectPath =
    path.join(
      projectDirectory,
      "CSharpApp.csproj"
    );

  const sourcePath =
    path.join(
      projectDirectory,
      "Program.cs"
    );

  const projectFile = `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>disable</Nullable>
  </PropertyGroup>
</Project>
`.trim();

  fs.writeFileSync(
    projectPath,
    projectFile,
    "utf8"
  );

  fs.writeFileSync(
    sourcePath,
    code,
    "utf8"
  );

  const buildResult =
    await runProcess(
      "dotnet",
      [
        "build",
        projectPath,
        "--nologo",
        "-c",
        "Release",
      ],
      {
        cwd:
          projectDirectory,
        timeout:
          EXECUTION_TIMEOUT,
      }
    );

  if (
    !buildResult.success
  ) {
    return {
      ...buildResult,
      phase: "compile",
    };
  }

  const runResult =
    await runProcess(
      "dotnet",
      [
        "run",
        "--project",
        projectPath,
        "--no-build",
        "-c",
        "Release",
      ],
      {
        cwd:
          projectDirectory,
        timeout:
          EXECUTION_TIMEOUT,
      }
    );

  return {
    ...runResult,
    phase: "run",
  };
};

/* =====================================================
   GO
===================================================== */

const executeGo = async (
  code,
  directory
) => {
  const sourcePath =
    path.join(
      directory,
      "main.go"
    );

  fs.writeFileSync(
    sourcePath,
    code,
    "utf8"
  );

  return runProcess(
    "go",
    [
      "run",
      sourcePath,
    ],
    {
      cwd: directory,
      timeout:
        EXECUTION_TIMEOUT,
    }
  );
};

/* =====================================================
   RUST
===================================================== */

const executeRust = async (
  code,
  directory
) => {
  const sourcePath =
    path.join(
      directory,
      "main.rs"
    );

  const executablePath =
    path.join(
      directory,
      "main.exe"
    );

  fs.writeFileSync(
    sourcePath,
    code,
    "utf8"
  );

  const compileResult =
    await runProcess(
      "rustc",
      [
        sourcePath,
        "-O",
        "-o",
        executablePath,
      ],
      {
        cwd: directory,
        timeout:
          EXECUTION_TIMEOUT,
      }
    );

  if (
    !compileResult.success
  ) {
    return {
      ...compileResult,
      phase: "compile",
    };
  }

  const runResult =
    await runProcess(
      executablePath,
      [],
      {
        cwd: directory,
        timeout:
          EXECUTION_TIMEOUT,
      }
    );

  return {
    ...runResult,
    phase: "run",
  };
};

/* =====================================================
   PHP
===================================================== */

const executePhp = async (
  code,
  directory
) => {
  const sourcePath =
    path.join(
      directory,
      "main.php"
    );

  fs.writeFileSync(
    sourcePath,
    code,
    "utf8"
  );

  return runProcess(
    "php",
    [sourcePath],
    {
      cwd: directory,
      timeout:
        EXECUTION_TIMEOUT,
    }
  );
};

/* =====================================================
   RUBY
===================================================== */

const executeRuby = async (
  code,
  directory
) => {
  const sourcePath =
    path.join(
      directory,
      "main.rb"
    );

  fs.writeFileSync(
    sourcePath,
    code,
    "utf8"
  );

  return runProcess(
    "ruby",
    [sourcePath],
    {
      cwd: directory,
      timeout:
        EXECUTION_TIMEOUT,
    }
  );
};

/* =====================================================
   HTML
===================================================== */

const executeHtml = async (
  code,
  directory
) => {
  const filePath =
    path.join(
      directory,
      "index.html"
    );

  fs.writeFileSync(
    filePath,
    code,
    "utf8"
  );

  /*
   * HTML is previewed in the frontend.
   */

  return {
    success: true,
    timedOut: false,
    code: 0,

    stdout: code,

    stderr: "",

    phase: "html",

    preview: code,
  };
};

/* =====================================================
   JSON
===================================================== */

const executeJson = async (
  code
) => {
  try {
    const parsed =
      JSON.parse(code);

    return {
      success: true,
      timedOut: false,
      code: 0,

      stdout:
        JSON.stringify(
          parsed,
          null,
          2
        ),

      stderr: "",

      phase: "json",
    };
  } catch (error) {
    return {
      success: false,
      timedOut: false,
      code: 1,
      stdout: "",
      stderr:
        `JSON Error: ${error.message}`,
      phase: "json",
    };
  }
};

/* =====================================================
   YAML
===================================================== */

const executeYaml = async (
  code,
  directory
) => {
  const filePath =
    path.join(
      directory,
      "main.yaml"
    );

  fs.writeFileSync(
    filePath,
    code,
    "utf8"
  );

  return {
    success: true,
    timedOut: false,
    code: 0,

    stdout: code,

    stderr: "",

    phase: "yaml",
  };
};

/* =====================================================
   FORMAT RESULT
===================================================== */

const formatResult = (
  result
) => {
  if (
    result.timedOut
  ) {
    return {
      success: false,
      output:
        `⏱️ Execution timed out after ${
          EXECUTION_TIMEOUT / 1000
        } seconds.`,
    };
  }

  if (
    !result.success
  ) {
    const errorOutput =
      result.stderr?.trim() ||
      result.stdout?.trim() ||
      "Code execution failed.";

    return {
      success: false,
      output:
        `❌ ${errorOutput}`,
    };
  }

  const output =
    result.stdout?.trim();

  return {
    success: true,

    output:
      output ||
      "✅ Code executed successfully.",
  };
};

/* =====================================================
   SUPPORTED LANGUAGES
===================================================== */

const supportedLanguages = [
  "javascript",
  "python",
  "c",
  "cpp",
  "java",
  "csharp",
  "go",
  "rust",
  "php",
  "ruby",
  "html",
  "json",
  "yaml",
];

/*
 * CSS intentionally removed.
 *
 * TypeScript intentionally removed.
 *
 * CSS and TypeScript are not treated as
 * executable standalone languages.
 */

/* =====================================================
   EXECUTE ROUTE
===================================================== */

router.post(
  "/",
  async (req, res) => {
    let directory = null;

    try {
      const {
        language,
        code,
      } = req.body || {};

      /* -----------------------------------------------
         NORMALIZE LANGUAGE
      ----------------------------------------------- */

      const normalizedLanguage =
        normalizeLanguage(
          language
        );

      if (
        !supportedLanguages.includes(
          normalizedLanguage
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            `Unsupported language: ${language}`,

          supportedLanguages,
        });
      }

      /* -----------------------------------------------
         VALIDATE CODE
      ----------------------------------------------- */

      if (
        typeof code !==
        "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Code must be a string.",
        });
      }

      if (
        !code.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No code provided.",
        });
      }

      if (
        Buffer.byteLength(
          code,
          "utf8"
        ) > MAX_CODE_SIZE
      ) {
        return res.status(413).json({
          success: false,
          message:
            "Code is too large. Maximum size is 100 KB.",
        });
      }

      console.log(
        `▶️ Executing ${normalizedLanguage}`
      );

      /* -----------------------------------------------
         CREATE TEMP DIRECTORY
      ----------------------------------------------- */

      directory =
        createExecutionDirectory();

      /* -----------------------------------------------
         EXECUTE
      ----------------------------------------------- */

      let result;

      switch (
        normalizedLanguage
      ) {
        case "javascript":
          result =
            await executeJavaScript(
              code,
              directory
            );
          break;

        case "python":
          result =
            await executePython(
              code,
              directory
            );
          break;

        case "c":
          result =
            await executeC(
              code,
              directory
            );
          break;

        case "cpp":
          result =
            await executeCpp(
              code,
              directory
            );
          break;

        case "java":
          result =
            await executeJava(
              code,
              directory
            );
          break;

        case "csharp":
          result =
            await executeCSharp(
              code,
              directory
            );
          break;

        case "go":
          result =
            await executeGo(
              code,
              directory
            );
          break;

        case "rust":
          result =
            await executeRust(
              code,
              directory
            );
          break;

        case "php":
          result =
            await executePhp(
              code,
              directory
            );
          break;

        case "ruby":
          result =
            await executeRuby(
              code,
              directory
            );
          break;

        case "html":
          result =
            await executeHtml(
              code,
              directory
            );
          break;

        case "json":
          result =
            await executeJson(
              code
            );
          break;

        case "yaml":
          result =
            await executeYaml(
              code,
              directory
            );
          break;

        default:
          return res.status(400).json({
            success: false,
            message:
              "Unsupported language.",
          });
      }

      /* -----------------------------------------------
         FORMAT
      ----------------------------------------------- */

      const formatted =
        formatResult(
          result
        );

      console.log(
        formatted.success
          ? `✅ ${normalizedLanguage} execution successful`
          : `❌ ${normalizedLanguage} execution failed`
      );

      return res.status(
        formatted.success
          ? 200
          : 400
      ).json({
        success:
          formatted.success,

        output:
          formatted.output,

        language:
          normalizedLanguage,

        phase:
          result.phase ||
          null,

        preview:
          result.preview ||
          null,
      });
    } catch (error) {
      console.error(
        "❌ Execution route error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Code execution failed.",
      });
    } finally {
      cleanupDirectory(
        directory
      );
    }
  }
);

/* =====================================================
   EXPORT
===================================================== */

module.exports = router;