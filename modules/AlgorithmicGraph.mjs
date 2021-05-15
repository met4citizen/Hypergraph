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
    this.rules = []; // rewriting rules
    this.initial = []; // initial graph
    this.command = ""; // command for a function to generate initial graph
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
  * Return euclidean distance between two points in n-dimension
  * @param {number} a Coordinates for point A
  * @param {number} b Coordinates for point B
  * @return {number} Distance.
  */
  static dist(a,b) {
    let sum = 0;
    for (let i = a.length - 1; i >= 0; i--) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
  * Return all r sized permutations of elements in array xs.
  * @param {number[]} xs Array of possible elements.
  * @param {number} r Number of elements in one permutation.
  * @return {number[][]} Permutations.
  */
  static perm(xs, r) {
    if (!r) return [];
    return xs.reduce(function(memo, cur, i) {
        let perms   = AlgorithmicGraph.perm(xs, r-1),
            newElms = !perms.length ? [[cur]] :
                      perms.map(function(perm) { return [cur].concat(perm) });
        return memo.concat(newElms);
    }, []);
  }

  /**
  * Return a spherical Fibonacci lattice with 'samples' points.
  * @param {number} samples Number of points on the sphere.
  * @param {number} radius Radius of the sphere.
  * @return {number[][]} Coordinates of the points.
  */
  static fibonacciSphere(samples, radius = 1 ) {
    let points = [];
    let phi = Math.PI * (3.0 - Math.sqrt(5.0))  // golden angle in radians
    for (var i = 0; i < samples; i++) {
      let y = 1 - (i / (samples - 1)) * 2;  // y goes from 1 to -1
      let distance = Math.sqrt( 1 - y * y );  // distance at y
      let theta = phi * i;  // golden angle increment
      let x = Math.cos(theta) * distance;
      let z = Math.sin(theta) * distance;
      points.push( [ radius * x, radius * y, radius * z ] );
    }
    return points;
  }

  /**
  * Produces a random sprinkling of points into a flat manifold of
  * given dimension.
  * @param {number[][]} manifold Dimension
  * @param {number} distance Distance limit
  * @return {number[][]} Edges
  */
  manifoldToGraph( manifold, distance = 1.01 ) {
    let edges = [];
    for ( let i = manifold.length-1; i>0; i--) {
      for( let j = i-1; j>=0; j-- ) {
        if ( Math.abs( AlgorithmicGraph.dist( manifold[i], manifold[j] )) < distance ) {
          // Random direction of the edge
          Math.random() > 0.5 ? edges.push( [i,j] ) : edges.push( [j,i] );
        }
      }
    }
    return edges;
  }

  /**
  * Produces a random sprinkling of points
  * @param {number} points Number of vertices
  * @return {number[][]} Edges
  */
  points( n ) {
    if ( (n < 10) || (n > 10000) )
      throw new Error("Number of points must be between 10-10000.");

    let edges = [];
    for( let i=0; i<n; i++) {
      edges.push( [i] );
    }

    return edges;
  }

  /**
  * Produces a random sprinkling of points into a flat grid of
  * given dimension and number of vertices.
  * @param {number} n Number of vertices
  * @param {number} dimension Dimension
  * @return {number[][]} Edges
  */
  grid( n, dimension ) {
    if ( (n < 1) || (n > 10000) )
      throw new Error("Number of points must be between 1-10000.");
    if ( (dimension < 1) || (dimension > 10) )
      throw new Error("Dimension must be between 1-10.");

    // Calculate one edge based on dimension
    let size = Math.ceil( Math.pow(n, 1 / dimension ) );
    let arr = Array( size ).fill().map( (v,i) => i );

    // Sprinkling
    let grid = AlgorithmicGraph.perm(arr, dimension);

    return this.manifoldToGraph( grid );
  }

  /**
  * Produces a random sprinkling of points into a flat sphere of
  * given number of vertices.
  * @param {number} n Number of vertices
  * @return {number[][]} Edges
  */
  sphere( n ) {
    if ( (n < 10) || (points > 10000) )
      throw new Error("Number of points must be between 10-10000.");

    // Sprinkling
    let p = AlgorithmicGraph.fibonacciSphere( n );
    let dist = AlgorithmicGraph.dist( p[1], p[2] );

    return this.manifoldToGraph( p, 1.1 * dist );
  }


  /**
  * Produces a random graph of n vertices using sprinkling
  * @param {number} n Number of vertices
  * @param {number} dimension Mininum number of edges per vertix
  * @param {number} connections Mininum number of edges per vertix
  * @return {number[][]} Edges
  */
  random( n, dimension, connections ) {
    if ( (n < 10) || (n > 1000) )
      throw new Error("Number of points must be between 10-1000.");
    if ( (dimension < 1) || (dimension > 20) )
      throw new Error("Dimension must be between 1-20.");
    if ( (connections < 1) || (connections > 100) )
      throw new Error("Connections must be between 1-100.");

    // Sprinkling
    let points = [];
    let alledges = [];
    for ( let i = 0; i < n; i++ ) {
      let point = Array( dimension ).fill().map(() => Math.random() );
      points.push( point );
      for ( let j = 0; j < i; j++ ) {
        let dist = AlgorithmicGraph.dist( points[i], points[j] );
        let edge = Math.random() > 0.5 ? [i,j] : [j,i]; // Random direction
        alledges.push( { edge: edge, dist: dist } );
      }
    }

    // Sort, min length first
    alledges.sort( (a,b) => a.dist - b.dist );

    // Ensure all vertices get at least two links
    let linkcnt = Array(n).fill(0);
    let edges = [];
    for ( let i = 0; i < alledges.length; i++ ) {
      let a = alledges[i].edge[0];
      let b = alledges[i].edge[1];
      if ( (linkcnt[ a ] < connections ) && (linkcnt[ b ] < connections ) ) {
        linkcnt[ a ]++; linkcnt[ b ]++;
        edges.push( [ a,b ]);
      }
    }

    return edges;
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

  static ruleToString( rule, initial = [], command = '' ) {
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

    // Initial state either as a command or sub-hypergraph
    if ( command.length ) {
      if ( rulestr.length > 0 ) rulestr = rulestr + "<br>";
      rulestr = rulestr + command;
    } else {
      if ( initial.length ) {
        if ( rulestr.length > 0 ) rulestr = rulestr + "<br>";
        initial.forEach( e => {
          rulestr = rulestr + "(" + e.map( v => v + 1 ).join(",") + ")";
        });
      }
    }
    return rulestr;
  }


  /**
  * Parse rule from a string.
  * @param {string} rulestr Rule string
  */
  setRule( rulestr ) {
    // Reset
    this.rules = [];
    this.initial.length = 0;
    this.command = "";

    // Check if empty
    if ( rulestr.length === 0 ) throw new SyntaxError("Given rule is empty.");

    // Change parenthesis types and remove extra ones
    rulestr = rulestr.toLowerCase()
    .replace( /\{|\[/g , "(" ).replace( /}|]/g , ")" )
    .replace( /(\()+/g , "(" ).replace( /(\))+/g , ")" )
    .replace( /(;)+/g , ";" ).replace( /;$/g ,"" );

    // Discard all unsupported characters
    rulestr = rulestr.replace( /[^()a-z0-9,=;>\.]+/g , "" );

    // Expand equal signs == as two separate reversible rules
    let a = rulestr.split(";");
    rulestr = "";
    a.forEach( s => {
      let b = s.split("==");
      if ( b.length === 2 ) {
        rulestr = rulestr + b[0] + ">" + b[1] + ";" + b[1] + ">" + b[0] + ";";
      } else {
        if ( s[0] !== '(' ) {
          // Any line not starting with parenthesis is consired as a command
          this.command = s.slice();
        } else {
          rulestr = rulestr + s + ";";
        }
      }
    });

    // To json format, '>' is the separator between lhr/rhs
    rulestr = rulestr.replace( /;$/g ,"" ).replace( /\),\(/g , ")(" )
    .replace( /^\(/g , "[{\"lhs\": [[\"" ).replace( /,/g , "\",\"" )
    .replace( /\);\(/g , "\"]]},{\"lhs\": [[\"" )
    .replace( /\)>\(/g , "\"]],\"rhs\": [[\"" )
    .replace( /\)\(/g , "\"],[\"" ).replace( /\)$/g , "\"]]}]" );

    // Nulls
    rulestr = rulestr.replace( /\[\[\"\"\]\]/g , "[]" );

    // JSON
    let r = [];
    try {
      if ( rulestr.length ) {
        r = JSON.parse( rulestr );
      }
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

    // Set rule and initial graph
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

    // Commands
    if ( this.command.length ) {
      const cmd = this.command.split("(").map( p => [ ...p.replace( /[^-a-z0-9,\.]+/g, "" ).split(",") ] );
      const func = cmd[0][0];
			const params = cmd[1];
      switch( func ) {
        case "points":
          this.initial = this.points( parseInt(params[0]) );
          break;
        case "line":
          this.initial = this.grid( parseInt(params[0]), 1 );
          break;
        case "grid": case "ngrid":
          this.initial = this.grid( parseInt(params[0]), parseInt(params[1]) );
          break;
        case "sphere":
          this.initial = this.sphere( parseInt(params[0]) );
          break;
        case "random":
          this.initial = this.random( parseInt(params[0]), parseInt(params[1]), parseInt(params[2]) );
          break;
        default:
          throw new Error( "Unknown command: " + func );

      }
      // Normalize
      const unique = [ ...new Set( [ ...this.initial.flat() ] ) ];
      this.initial.forEach( (w,j) => {
        for( k=0; k < w.length; k++ ) this.initial[j][k] = unique.indexOf( w[k] );
      });
      this.initial.sort( (a,b) => Math.min( ...a ) - Math.min( ...b ) );
    }

    // use first lhs as the initial state, if not specified
    if ( r.length && this.initial.length === 0 ) this.initial = [ ...r[0].lhs ];

    // Check if there was a valid rule
    if ( this.initial.length === 0 ) {
      throw new SyntaxError("Parsing the rule failed.");
    }

  }

  /**
  * Return rule as a string.
  * @return {string} Rule as a string.
  */
  getRule() {
    return AlgorithmicGraph.ruleToString( this.rules, this.initial, this.command );
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
