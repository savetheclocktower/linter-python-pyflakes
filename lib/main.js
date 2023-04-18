const LinterPyflakes = require('./linter-python-pyflakes');

module.exports = {
  scopes: ['source.python'],

  linter: null,

  activate () {
    this.linter = new LinterPyflakes();
  },

  provideLinter () {
    return {
      name: 'Pyflakes',
      scope: 'file',
      lintsOnChange: false,
      grammarScopes: this.scopes,
      lint: async (editor) => {
        let messages = await this.linter.lint(editor);
        return messages;
      }
    };
  }
};
