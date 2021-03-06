import * as t from "@babel/types";

export function WithStatement(node: Object) {
  this.word("with");
  this.space();
  this.token("(");
  this.print(node.object, node);
  this.token(")");
  this.printBlock(node);
}

export function IfStatement(node: Object) {
  this.word("if");
  this.space();
  this.token("(");
  this.print(node.test, node);
  this.token(")");
  this.space();

  const needsBlock =
    node.alternate && t.isIfStatement(getLastStatement(node.consequent));
  if (needsBlock) {
    this.token("{");
    this.newline();
    this.indent();
  }

  this.printAndIndentOnComments(node.consequent, node);

  if (needsBlock) {
    this.dedent();
    this.newline();
    this.token("}");
  }

  if (node.alternate) {
    if (this.endsWith("}")) this.space();
    this.word("else");
    this.space();
    this.printAndIndentOnComments(node.alternate, node);
  }
}

// @esmiralha @momo https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
function getObjectHash(obj) {
  var str = JSON.stringify(obj);
  var hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash + 2147483647 + 1;
};

export function ReturnIfStatement(node: Object) {
  /* Creating a named `var` seems unavoidable here. Is there another way?
   * 
   * If we name a var:
   *     1) its name must not collide with others in our program
   *     2) transipiling should remain deterministic
   * 
   * Using the hash of the AST node as variable name suffix (likely) achieves these 2 properites.
   * This seems both clever and dirty, but it's what I went with.
   */
  var varName = 'returnIf_' + getObjectHash(node);

  this.word("var");
  this.space();
  this.word(varName);
  this.space();
  this.token("=");
  this.space();
  this.token("("); // extra parens, for good luck
  this.print(node.argument, node);
  this.token(")");
  this.token(";");

  this.newline();
  this.word("if");
  this.space();
  this.token("(");
  this.word(varName);
  this.token(")");
  this.space();
  this.token("{");
  this.newline();

  this.indent();
  this.word("return");
  this.space();
  this.word(varName);
  this.token(";")
  this.dedent();

  this.newline();
  this.token("}");
  this.newline();
}

// Recursively get the last statement.
function getLastStatement(statement) {
  if (!t.isStatement(statement.body)) return statement;
  return getLastStatement(statement.body);
}

export function ForStatement(node: Object) {
  this.word("for");
  this.space();
  this.token("(");

  this.inForStatementInitCounter++;
  this.print(node.init, node);
  this.inForStatementInitCounter--;
  this.token(";");

  if (node.test) {
    this.space();
    this.print(node.test, node);
  }
  this.token(";");

  if (node.update) {
    this.space();
    this.print(node.update, node);
  }

  this.token(")");
  this.printBlock(node);
}

export function WhileStatement(node: Object) {
  this.word("while");
  this.space();
  this.token("(");
  this.print(node.test, node);
  this.token(")");
  this.printBlock(node);
}

const buildForXStatement = function(op) {
  return function(node: Object) {
    this.word("for");
    this.space();
    if (op === "of" && node.await) {
      this.word("await");
      this.space();
    }
    this.token("(");
    this.print(node.left, node);
    this.space();
    this.word(op);
    this.space();
    this.print(node.right, node);
    this.token(")");
    this.printBlock(node);
  };
};

export const ForInStatement = buildForXStatement("in");
export const ForOfStatement = buildForXStatement("of");

export function DoWhileStatement(node: Object) {
  this.word("do");
  this.space();
  this.print(node.body, node);
  this.space();
  this.word("while");
  this.space();
  this.token("(");
  this.print(node.test, node);
  this.token(")");
  this.semicolon();
}

function buildLabelStatement(prefix, key = "label") {
  return function(node: Object) {
    this.word(prefix);

    const label = node[key];
    if (label) {
      this.space();
      const isLabel = key == "label";
      const terminatorState = this.startTerminatorless(isLabel);
      this.print(label, node);
      this.endTerminatorless(terminatorState);
    }

    this.semicolon();
  };
}

export const ContinueStatement = buildLabelStatement("continue");
export const ReturnStatement = buildLabelStatement("return", "argument");
export const BreakStatement = buildLabelStatement("break");
export const ThrowStatement = buildLabelStatement("throw", "argument");

export function LabeledStatement(node: Object) {
  this.print(node.label, node);
  this.token(":");
  this.space();
  this.print(node.body, node);
}

export function TryStatement(node: Object) {
  this.word("try");
  this.space();
  this.print(node.block, node);
  this.space();

  // Esprima bug puts the catch clause in a `handlers` array.
  // see https://code.google.com/p/esprima/issues/detail?id=433
  // We run into this from regenerator generated ast.
  if (node.handlers) {
    this.print(node.handlers[0], node);
  } else {
    this.print(node.handler, node);
  }

  if (node.finalizer) {
    this.space();
    this.word("finally");
    this.space();
    this.print(node.finalizer, node);
  }
}

export function CatchClause(node: Object) {
  this.word("catch");
  this.space();
  if (node.param) {
    this.token("(");
    this.print(node.param, node);
    this.token(")");
    this.space();
  }
  this.print(node.body, node);
}

export function SwitchStatement(node: Object) {
  this.word("switch");
  this.space();
  this.token("(");
  this.print(node.discriminant, node);
  this.token(")");
  this.space();
  this.token("{");

  this.printSequence(node.cases, node, {
    indent: true,
    addNewlines(leading, cas) {
      if (!leading && node.cases[node.cases.length - 1] === cas) return -1;
    },
  });

  this.token("}");
}

export function SwitchCase(node: Object) {
  if (node.test) {
    this.word("case");
    this.space();
    this.print(node.test, node);
    this.token(":");
  } else {
    this.word("default");
    this.token(":");
  }

  if (node.consequent.length) {
    this.newline();
    this.printSequence(node.consequent, node, { indent: true });
  }
}

export function DebuggerStatement() {
  this.word("debugger");
  this.semicolon();
}

function variableDeclarationIndent() {
  // "let " or "var " indentation.
  this.token(",");
  this.newline();
  if (this.endsWith("\n")) for (let i = 0; i < 4; i++) this.space(true);
}

function constDeclarationIndent() {
  // "const " indentation.
  this.token(",");
  this.newline();
  if (this.endsWith("\n")) for (let i = 0; i < 6; i++) this.space(true);
}

export function VariableDeclaration(node: Object, parent: Object) {
  if (node.declare) {
    // TS
    this.word("declare");
    this.space();
  }

  this.word(node.kind);
  this.space();

  let hasInits = false;
  // don't add whitespace to loop heads
  if (!t.isFor(parent)) {
    for (const declar of (node.declarations: Array<Object>)) {
      if (declar.init) {
        // has an init so let's split it up over multiple lines
        hasInits = true;
      }
    }
  }

  //
  // use a pretty separator when we aren't in compact mode, have initializers and don't have retainLines on
  // this will format declarations like:
  //
  //   let foo = "bar", bar = "foo";
  //
  // into
  //
  //   let foo = "bar",
  //       bar = "foo";
  //

  let separator;
  if (hasInits) {
    separator =
      node.kind === "const"
        ? constDeclarationIndent
        : variableDeclarationIndent;
  }

  //

  this.printList(node.declarations, node, { separator });

  if (t.isFor(parent)) {
    // don't give semicolons to these nodes since they'll be inserted in the parent generator
    if (parent.left === node || parent.init === node) return;
  }

  this.semicolon();
}

export function VariableDeclarator(node: Object) {
  this.print(node.id, node);
  if (node.definite) this.token("!"); // TS
  this.print(node.id.typeAnnotation, node);
  if (node.init) {
    this.space();
    this.token("=");
    this.space();
    this.print(node.init, node);
  }
}
