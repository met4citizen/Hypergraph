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
    this.rulestr = ""; // user-specified rewriting rules

    this.commands = []; // commands
    this.rules = []; // rewriting rules
    this.initial = []; // initial graph
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
  static d(a,b) {
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
  * Return the distance of two points on a Fibonacci sphere radius = 1
  * @param {number} i Index of point 1
  * @param {number} j Index of point 2
  * @param {number} n Total number of points 1
  * @param {number} m Total number of points 2
  * @return {number} Distance on a unit sphere
  */
  static fibonacciD(i, j, n, m) {
    // Point on a spherical Fibonacci lattice
    function p(x,n) {
      let phi = Math.PI * (3.0 - Math.sqrt(5.0))  // golden angle in radians
      let y = 1 - ( x / (n-1)) * 2;
      let d = Math.sqrt( 1 - y*y );
      return [ Math.cos(phi*x)*d, y ,Math.sin(phi*x)*d ];
    }
    return AlgorithmicGraph.d( p(i,n), p(j,m) );
  }


  /**
  * Creates a graph from sprinkled points in n-dimensional euclidean space
  * @param {number[][]} manifold Array of point coordinates
  * @param {number} distance Distance limit
  * @return {number[][]} Edges
  */
  manifoldToGraph( manifold, distance = 1.01 ) {
    let edges = [];
    for ( let i = manifold.length-1; i>0; i--) {
      for( let j = i-1; j>=0; j-- ) {
        if ( Math.abs( AlgorithmicGraph.d( manifold[i], manifold[j] )) < distance ) {
          // Random direction of the edge
          Math.random() > 0.5 ? edges.push( [i,j] ) : edges.push( [j,i] );
        }
      }
    }
    return edges;
  }

  /**
  * Produces a random sprinkling of points
  * @param {number} n Number of vertices
  * @return {number[][]} Edges
  */
  points( n ) {
    if ( (n < 10) || (n > 10000) )
      throw new Error("[Points] Number of points must be between 10-10000.");

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
      throw new Error("[Grid] Number of points must be between 1-10000.");
    if ( (dimension < 1) || (dimension > 10) )
      throw new Error("[Grid] Dimension must be between 1-10.");

    // Calculate one edge based on dimension
    let size = Math.ceil( Math.pow(n, 1 / dimension ) );
    let arr = Array( size ).fill().map( (v,i) => i );

    // Sprinkling
    let grid = AlgorithmicGraph.perm(arr, dimension);

    return this.manifoldToGraph( grid );
  }

  /**
  * Produces a random graph of n vertices using sprinkling
  * @param {number} n Number of vertices
  * @param {number} dimension Mininum number of edges per vertix
  * @param {number} connections Mininum number of edges per vertix
  * @param {number} mode Mode, 0=n-cube, 1=n-ball
  * @param {number} exp If TRUE use exponential distribution
  * @return {number[][]} Edges
  */
  random( n, dimension, connections ) {
    if ( (n < 10) || (n > 1000) )
      throw new Error("[Random] Number of points must be between 10-1000.");
    if ( (dimension < 1) || (dimension > 20) )
      throw new Error("[Random] Dimension must be between 1-20.");
    if ( (connections < 1) || (connections > 100) )
      throw new Error("[Random] Connections must be between 1-100.");

    // Sprinkling
    let points = [];
    let alledges = [];
    let origo = Array( dimension ).fill(0);
    for ( let i = 0; i < n; i++ ) {
      // Random point; if mode==1 filter out points outside the n-ball
      let point = Array( dimension ).fill().map(() => 2 * Math.random() - 1 );
      points.push( point );

      // All possible edges using random direction
      for ( let j = 0; j < i; j++ ) {
        let dist = AlgorithmicGraph.d( points[i], points[j] );
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
  * A black hole (EXPERIMENTAL)
  * Curves Fibonacci spiral by using Schwarzschild proper radial distance.
  * @param {number} n Number of vertices
  * @param {number} rs Schwarzschild radius
  * @return {number[][]} Edges
  */
  blackhole( n, rs ) {
    if ( (n < 10) || (n > 1000) )
      throw new Error("[Blackhole] Number of points must be between 10-1000.");
    if ( (rs < 0) || (rs > 1000) )
      throw new Error("[Blackhole] Schwarzschild radius must be between 0-1000.");

    // Schwarzschild proper radial distance
    function prd(r,rs) {
      return r * Math.sqrt(1-rs/r)+(rs/2)*Math.log(2*r*(Math.sqrt(1-rs/r)+1)-rs);
    }

    let edges = [ [0] ];
    let phi = Math.PI * (3.0 - Math.sqrt(5.0)); // Golden angle

    for( let i = 0; i < n-1; i++ ) {
      // List of vertices to connect
      let connect = [];

      // Connect to a closest neighbour
      connect.push( i + 1 );

      // Connect radial neighbours, # of neighbours relative to curvature
      let k = Math.max( 1, n * ( prd( ((i+2)/n)+rs, rs ) - prd( ((i+1)/n)+rs, rs ) ) );
      for( let l = 1; l <= k; l++ ) {
        let x = Math.round( i + l * 2 * Math.PI * (i+rs) / phi );
        if ( x < n ) {
          connect.push( x );
        }
      }

      // Create edges with random direction
      connect = [ ...new Set( connect ) ];
      for( let m=0; m < connect.length; m++ ) {
        let [ a,b ] = Math.random() > 0.5 ? [i,connect[m]] : [connect[m],i];
        edges.push( [ a,b ] );
      }
    }

    return edges;
  }

  /**
  * Twin black hole. See function blackhole.
  * @param {number} n Number of vertices
  * @param {number} rs Schwarzschild radius
  * @return {number[][]} Edges
  */
  blackhole2( n, rs ) {
    let bh1 = this.blackhole( n, rs );
    let bh2 = this.blackhole( n, rs ).map( e => e.map( x => x + Math.round( 4 * n / 5 ) ));

    let edges = [ ...new Set( [ ...bh1, ...bh2 ] ) ];
    return edges;
  }

  /**
  * Einstein-Rosen Bridge (Experimental)
  * @param {number} n Number of vertices of one side
  * @param {number} rs Schwarzschild radius
  * @return {number[][]} Edges
  */
  erb( n, rs ) {
    let bh1 = this.blackhole( n, rs );
    let bh2 = this.blackhole( n, rs ).map( e => e.map( x => x + n ) );

    let edges = [ ...new Set( [ ...bh1, ...bh2 ] ) ];

    // Create the bridge
    let nlinks = Math.max( 4, rs / 10 );
    for( let i = 0; i < nlinks; i++ ) {
      let v = Math.floor( Math.random() * nlinks );
      let u = Math.floor( Math.random() * nlinks ) + n;

      let [ a,b ] = Math.random() > 0.5 ? [v,u] : [u,v];
      edges.push( [ a,b ] );
    }

    return edges;
  }

  /**
  * Produces a complete graph with n vertices
  * @param {number} n Number of vertices
  * @param {number} d The number of egdes between vertices
  * @param {number} surface If true, connect only the surface
  * @return {number[][]} Edges
  */
  complete( n, d = 1, surface = false ) {
    let fibDistRef = 0.0; // Reference distance on a Fibonacci sphere
    if ( surface ) {
      fibDistRef = 1.1 * AlgorithmicGraph.fibonacciD(1,2,n,n);
      if ( (n < 5) || (n > 1000) )
        throw new Error("[Sphere] Number of vertices must be between 5-1000.");
    } else {
      if ( (n < 1) || (n > 100) )
        throw new Error("[Complete] Number of vertices must be between 1-100.");
    }

    let edges = [];
    let v = n;
    for( let i=0; i<n-1; i++ ) {
      for( let j=i+1; j<n; j++ ) {
        // Continue if the points are not near each other on a surface of a sphere
        if ( surface && AlgorithmicGraph.fibonacciD(i,j,n,n) > fibDistRef ) continue;

        // Random direction of the edge
        let [ a,b ] = Math.random() > 0.5 ? [i,j] : [j,i];

        //
        let c = [ a, ...Array(d-1).fill().map( x => v++ ), b ];
        for( let k = 0; k < c.length-1; k++ ) {
          edges.push( [ c[k], c[k+1 ] ] );
        }
      }
    }

    return edges;
  }

  /**
  * Parse rule/command from a string.
  * @param {string} str Rule/command string
  */
  setRule( str ) {
    // Reset
    this.rulestr = "";
    this.commands.length = 0;
    this.rules.length = 0;
    this.initial.length = 0;

    // Check if empty
    if ( str.length === 0 ) throw new SyntaxError("Given rule is empty.");

    // Change parenthesis types and remove extra ones
    str = str.toLowerCase()
    .replace( /\{|\[/g , "(" ).replace( /}|]/g , ")" )
    .replace( /(\()+/g , "(" ).replace( /(\))+/g , ")" )
    .replace( /(;)+/g , ";" ).replace( /;$/g ,"" );

    // Discard all unsupported characters
    str = str.replace( /[^()a-z0-9,=;>\.\-]+/g , "" );

    // Expand equal signs == as two separate reversible rules
    let rulestr = "";
    str.split(";").forEach( s => {
      if ( s[0] === '(' && ( s.includes("==") || s.includes(">") ) ) {
        // Rule
        let b = s.split("==");
        if ( b.length === 2 ) {
          rulestr = rulestr + b[0] + ">" + b[1] + ";" + b[1] + ">" + b[0] + ";";
        } else {
          rulestr = rulestr + s + ";";
        }
      } else {
        // Command
        this.commands.push( s.slice() );
      }
    });

    // To json format, '>' is the separator between lhr/rhs
    rulestr = rulestr.replace( /\-/g, "")
    .replace( /;$/g ,"" ).replace( /\),\(/g , ")(" )
    .replace( /^\(/g , "[{\"lhs\": [[\"" ).replace( /,/g , "\",\"" )
    .replace( /\);\(/g , "\"]]},{\"lhs\": [[\"" )
    .replace( /\)>\(/g , "\"]],\"rhs\": [[\"" )
    .replace( /\)\(/g , "\"],[\"" ).replace( /\)$/g , "\"]]}]" );

    // Nulls
    rulestr = rulestr.replace( /\[\[\"\"\]\]/g , "[]" );

    // JSON
    try {
      if ( rulestr.length ) {
        this.rules = JSON.parse( rulestr );
      }
    }
    catch( e ) {
      throw new SyntaxError("Invalid rule format.");
    }

    // Normalize each rule and sort
    let k, unique;
    this.rules.forEach( (v,i) => {
      const lhs = v.hasOwnProperty("lhs") ? v.lhs.flat() : [];
      const rhs = v.hasOwnProperty("rhs") ? v.rhs.flat() : [];
      const unique = [ ...new Set( [ ...lhs, ...rhs ] ) ];
      v.lhs.forEach( (w,j) => {
        for( k=0; k < w.length; k++ ) this.rules[i].lhs[j][k] = unique.indexOf( w[k] );
      });
      // NOTE: Do not sort LHS, because wolfram Model event ordering depends
      // on the order of the edges
      if ( v.hasOwnProperty("rhs") ) {
        v.rhs.forEach((w,j) => {
          for( k=0; k < w.length; k++ ) this.rules[i].rhs[j][k] = unique.indexOf( w[k] );
        });
        // NOTE: Do not sort RHS, because Wolfram Model event ordering depends
        // on the order of the edges
      }
    });

    // Change ()->(1,2) to (1,2)
    for( let i = this.rules.length-1; i>=0; i-- ) {
      if ( this.rules[i].lhs.length === 0 ) {
        let j = "";
        this.rules[i].rhs.forEach( e => {
          j = j + "(" + e.map( v => v + 1 ).join(",") + ")";
        });
        this.commands.push( j );
        this.rules.splice(i,1);
      }
    }


    // Take user specified rules as a basis for rules
    this.rules.forEach( r => {
      if ( this.rulestr.length ) this.rulestr = this.rulestr + "<br>";
      r.lhs.forEach( e => {
        this.rulestr = this.rulestr + "(" + e.map( v => v + 1 ).join(",") + ")";
      });
      this.rulestr = this.rulestr + "->";
      if ( r.rhs.length === 0 ) {
        this.rulestr = this.rulestr + "()";
      } else {
        r.rhs.forEach( e => {
          this.rulestr = this.rulestr + "(" + e.map( v => v + 1 ).join(",") + ")";
        });
      }
    });

    // Commands
    this.commands.forEach( c => {
      const cmd = c.split("(").map( p => [ ...p.replace( /[^-a-z0-9,\.]+/g, "" ).split(",") ] );
      const func = cmd[0][0];
			const params = cmd[1];

      switch( func ) {
        case "": // initial graph
          cmd.forEach( (x,i) => { if ( i > 0 ) this.initial.push( x ); });
          break;
        case "points":
          this.initial.push( ...this.points( parseInt(params[0]) ) );
          break;
        case "line":
          this.initial.push( ...this.grid( parseInt(params[0]), 1 ) );
          break;
        case "grid": case "ngrid":
          this.initial.push( ...this.grid( parseInt(params[0]), parseInt(params[1]) ) );
          break;
        case "sphere":
          this.initial.push( ...this.complete( parseInt(params[0]), 1, true ) );
          break;
        case "blackhole":
          this.initial.push( ...this.blackhole( parseInt(params[0]), parseFloat(params[1]) ) );
          break;
        case "blackhole2":
          this.initial.push( ...this.blackhole2( parseInt(params[0]), parseFloat(params[1]) ) );
          break;
        case "erb":
          this.initial.push( ...this.erb( parseInt(params[0]), parseFloat(params[1]) ) );
          break;
        case "random":
          this.initial.push( ...this.random( parseInt(params[0]), parseInt(params[1]), parseInt(params[2]) ) );
          break;
        case "complete":
          this.initial.push( ...this.complete( parseInt(params[0]) ) );
          break;
        default:
          throw new Error( "Unknown command: " + func );
      }

      if ( this.rulestr.length ) this.rulestr = this.rulestr + "<br>";
      this.rulestr = this.rulestr + c;
    });

    // Use first lhs as the initial state, if not specified
    // Note: replace all vertices with pattern 1, e.g. (1,2) => (1,1)
    if ( this.rules.length && this.initial.length === 0 ) {
      this.initial.push( ...this.rules[0].lhs.map( e => e.map( x => 1 )) );
    }

    // Normalize
    this.initial = this.initial.map( e => e.map(String) );
    unique = [ ...new Set( [ ...this.initial.flat() ] ) ];
    this.initial = this.initial.map( e => e.map( x => unique.indexOf( x ) ) );

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
    return this.rulestr;
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
