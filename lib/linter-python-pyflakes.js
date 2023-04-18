const { BufferedProcess, CompositeDisposable, Point, Range } = require('atom');

function promisifySpawn (command, args) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    let bp = new BufferedProcess({
      command,
      args,
      stdout: data => {
        stdout += data.toString('utf-8');
      },
      stderr: data => {
        stderr += data.toString('utf-8');
      },
      exit: () => {
        if (stdout !== "") {
          resolve(stdout);
        } else {
          reject({ stderr, stdout });
        }
      }
    });

    // Reject this promise if the worker fails to spawn.
    bp.process.on('error', (...args) => {
      console.warn('Worker exited with error:', ...args);
      reject(args);
    });
  });
}


class LinterPyflakes {
  constructor () {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.config.observe('linter-python-pyflakes.pyflakesDirToExecutable', (value) => {
        this.executablePath = value;
      })
    );
  }

  destroy () {
    this.subscriptions.dispose();
  }

  interpretOutput (output, editor) {
    if (!output) { return []; }
    let lines = output.split(/\n/);
    let messages = [];
    for (let line of lines) {
      line = line.trim();
      if (!/\S/.test(line)) { continue; }

      let [stuff, description] = line.split(/:\s/);
      // eslint-disable-next-line no-unused-vars
      let [_, row, column] = stuff.split(/:/g);

      let position = new Point(
        Number(row) - 1,
        Number(column) - 1
      );

      let range = new Range(
        position,
        position.traverse([0, 1])
      );

      messages.push({
        location: {
          file: editor.getPath(),
          position: range
        },
        severity: 'error',
        excerpt: description
      });
    }

    return messages;
  }

  async lint (editor) {
    let cmd = `${this.executablePath}`;

    // TODO: Couldn't figure out how to lint unsaved files; `pyflakes` lets you
    // pipe to STDIN, but requires a SIGQUIT after the write to STDIN, and that
    // never seemed to work properly with `child_process`.
    let args = [editor.getPath()];
    let result;
    try {
      result = await promisifySpawn(cmd, args);
    } catch (err) {
      console.error('Error:', err);
    }

    let messages = this.interpretOutput(result, editor);

    return messages;
  }
}

module.exports = LinterPyflakes;
