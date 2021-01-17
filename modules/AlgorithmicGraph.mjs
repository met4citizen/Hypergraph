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
    this.add( [ root ] );
    let prev = root;

    // Rules
    this.rules.forEach( (rule, i) => {
      if ( i > 0 ) {
        this.add( [ this.maxv, root ] );
        this.add( [ prev, this.maxv ] );
        prev = this.maxv;
      }
      rule.lhs.forEach( (pattern,j) => {
        this.V.get( this.maxv )["label"] = "("+pattern.map( x => x+1 ).toString()+")";
        if ( j > 0 ) {
          this.add( [ prev, this.maxv ] );
          prev = this.maxv;
        }
        pattern.forEach( v => {
          const edge = [ this.maxv ];
          for( let k = 0; k <= v; k++ ) edge.push( ++this.maxv );
          this.add( edge );
        });
      });
      this.add( [ prev, this.maxv ] );
      prev = this.maxv;
      rule.rhs.forEach( (pattern,j) => {
        if ( j === 0 ) {
          this.V.get( this.maxv )["label"] = "->("+pattern.map( x => x+1 ).toString()+")";
        } else {
          this.V.get( this.maxv )["label"] = "("+pattern.map( x => x+1 ).toString()+")";
          this.add( [ prev, this.maxv ] );
          prev = this.maxv;
        }
        pattern.forEach( (v,l) => {
          const edge = [ this.maxv ];
          for( let k = 0; k <= v; k++ ) {
            if ( i === (this.rules.length - 1) && j === (rule.rhs.length-1) && l === (pattern.length-1) && k === v ) {
              edge.push( root );
            } else {
              edge.push( ++this.maxv );
            }
          }
          this.add( edge );
        });
      });
    });
    this.add( [ prev, root ] );

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
    var rulestr = "";
    this.rules.forEach( r => {
      if ( rulestr !== "" ) rulestr = rulestr + "<br>";
      r.lhs.forEach( e => {
        rulestr = rulestr + "(" + e.map( v => v + 1 ).join(",") + ")";
      });
      if ( typeof r.rhs !== 'undefined' ) {
        rulestr = rulestr + "->";
        r.rhs.forEach( e => {
          rulestr = rulestr + "(" + e.map( v => v + 1 ).join(",") + ")";
        });
      }
    });
    // Initial state
    if ( rulestr.length > 0 ) rulestr = rulestr + "<br>";
    this.initial.forEach( e => {
      rulestr = rulestr + "(" + e.map( v => v + 1 ).join(",") + ")";
    });
    return rulestr;
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
