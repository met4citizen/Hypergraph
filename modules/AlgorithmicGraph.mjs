import { Hypergraph } from "./Hypergraph.mjs";

/**
* @class Graph representing the space of all algorithms.
* @author Mika Suominen
*/
class AlgorithmicGraph extends Hypergraph  {

  /**
  * Creates an instance of AlgorithmicGraph.
  * @constructor
  */
  constructor() {
    super();
    this.rules = [];
    this.initial = [];
  }

  /**
  * Return vertex label.
  * @param {Vertex} v Vertex
  * @return {string} Vertex label.
  */
  vertexLabel( v ) {
    if ( !this.V.has( v ) ) return false;
    const u = this.V.get( v );
    if ( !u.hasOwnProperty("label") ) return false;
    return u.label;
  }

  /**
  * Construct algorithmic graphs based on graph grammar.
  */
  rewrite() {
    // Clear the graph
    this.clear();

    let root = ++this.maxv;
    this.V.set( root, { in: [], out: [], label: AlgorithmicGraph.ruleToString( this.rules ) });

    for( let i = 0; i < 5; i++ ) {
      let prev = ++this.maxv;
      this.V.set( prev, { in: [], out: [], label: AlgorithmicGraph.ruleToString( this.rules ) });
      this.add( [ root, prev ] );
      for( let j = 0; j < 5; j++ ) {
        let node = ++this.maxv;
        this.V.set( node, { in: [], out: [], label: AlgorithmicGraph.ruleToString( this.rules ) });
        this.add( [ prev, node ] );
      }
    }

  }

  static ruleToString( rule, initial = [] ) {
    let rulestr = "";
    rule.forEach( r => {
      if ( rulestr !== "" ) rulestr = rulestr + "<br>";
      r.lhs.forEach( e => {
        rulestr = rulestr + "(" + e.map( v => v + 1 ).join(",") + ")";
      });
      if ( typeof r.rhs !== 'undefined' ) {
        rulestr = rulestr + "->";
        if ( r.rhs.length ) {
          r.rhs.forEach( e => {
            rulestr = rulestr + "(" + e.map( v => v + 1 ).join(",") + ")";
          });
        } else {
          rulestr = rulestr + "()";
        }
      }
    });
    // Initial state
    if ( initial.length ) {
      if ( rulestr.length > 0 ) rulestr = rulestr + "<br>";
      initial.forEach( e => {
        rulestr = rulestr + "(" + e.map( v => v + 1 ).join(",") + ")";
      });
    }
    return rulestr;
  }


  /**
  * Parse rule from a string.
  * @param {string} rulestr Rule string
  */
  setRule( rulestr ) {
    // Check if empty
    if ( rulestr.length === 0 ) throw new SyntaxError("Given rule is empty.");

    // Change parenthesis types and remove extra ones
    rulestr = rulestr.toLowerCase()
    .replace( /\{|\[/g , "(" ).replace( /}|]/g , ")" )
    .replace( /(\()+/g , "(" ).replace( /(\))+/g , ")" );

    // Discard all unsupported characters
    rulestr = rulestr.replace( /[^()a-z0-9,;>]+/g , "" );

    // To json format, '>' is the separator between lhr/rhs
    rulestr = rulestr.replace( /\),\(/g , ")(" )
    .replace( /^\(/g , "[{\"lhs\": [[\"" ).replace( /,/g , "\",\"" )
    .replace( /\);\(/g , "\"]]},{\"lhs\": [[\"" )
    .replace( /\)>\(/g , "\"]],\"rhs\": [[\"" )
    .replace( /\)\(/g , "\"],[\"" ).replace( /\)$/g , "\"]]}]" );

    // Nulls
    rulestr = rulestr.replace( /\[\[\"\"\]\]/g , "[]" );

    // JSON
    let r;
    try {
      r = JSON.parse( rulestr );
    }
    catch( e ) {
      throw new SyntaxError("Invalid rule format.");
    }

    // Normalize each rule and sort
    let k, unique;
    r.forEach( (v,i) => {
      const lhs = v.hasOwnProperty("lhs") ? v.lhs.flat() : [];
      const rhs = v.hasOwnProperty("rhs") ? v.rhs.flat() : [];
      const unique = [ ...new Set( [ ...lhs, ...rhs ] ) ];
      v.lhs.forEach( (w,j) => {
        for( k=0; k < w.length; k++ ) r[i].lhs[j][k] = unique.indexOf( w[k] );
      });
      v.lhs.sort( (a,b) => Math.min( ...a ) - Math.min( ...b ) );
      if ( v.hasOwnProperty("rhs") ) {
        v.rhs.forEach((w,j) => {
          for( k=0; k < w.length; k++ ) r[i].rhs[j][k] = unique.indexOf( w[k] );
        });
        v.rhs.sort( (a,b) => Math.min( ...a ) - Math.min( ...b ) );
      }
    });

    // Check if there was a valid rule
    if ( r.length == 0 ) throw new SyntaxError("Parsing the rule failed.");

    // Set rule and initial graph
    this.initial.length = 0;
    this.rules = r.filter( v => {
      if ( !v.hasOwnProperty("rhs") ) {
        this.initial = [ ...this.initial, ...v.lhs ];
        return false;
      }
      if ( v.lhs.length === 0 ) {
        this.initial = [ ...this.initial, ...v.rhs ];
        return false;
      }
      return true;
    });

    // use first lhs as the initial state, if not specified
    if ( this.initial.length === 0 ) this.initial = [ ...r[0].lhs ];
  }

  /**
  * Return rule as a string.
  * @return {string} Rule as a string.
  */
  getRule() {
    return AlgorithmicGraph.ruleToString( this.rules, this.initial );
  }

  /**
  * Report status.
  * @return {Object} Status of algorithmic graph.
  */
  status() {
    const stat = super.status();
    stat["rules"] = this.rules.length;
    return stat;
  }


}
export { AlgorithmicGraph };
