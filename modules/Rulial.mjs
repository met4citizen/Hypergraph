import { Parser } from "./Parser.mjs";

/**
* @class The space of all rewriting rules.
* @author Mika Suominen
* @author Tuomas Sorakivi
*/
class Rulial {

  /**
  * Creates an instance of Rulial.
  * @constructor
  */
  constructor() {
    this.parser = new Parser();
  }

  get initial() {
    return this.parser.initial
  }

  get rules() {
    return this.parser.rules
  }

  /**
  * Clear the Rulial for reuse.
  */
  clear() {
    this.parser.clear()
  }

  setRule( str ) {
    this.parser.setRule(str)
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
    return Rulial.d( p(i,n), p(j,m) );
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
        if ( Math.abs( Rulial.d( manifold[i], manifold[j] )) < distance ) {
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
    if ( (n < 1) || (n > 10000) )
      throw new RangeError("[Points] Number of points must be between 1-10000.");
    return new Array(n).fill().map((_,i) => [i]);
  }

  /**
  * Produces a random sprinkling of points into a flat grid of
  * given dimension and number of vertices.
  * @param {number[]} ls Arrays of edge sizes [ dx, dy, dz, ... ]
  * @return {number[][]} Edges
  */
  grid( ls ) {
    let n = ls.reduce( (a,b) => a * b, 1);
    if ( (n < 1) || (n > 10000) )
      throw new RangeError("[Grid] Number of points must be between 1-10000.");

    let sizes = ls.reduce( (a,x,i,arr) => {
      a.push( i ? a[i-1]*arr[i-1] : 1 );
      return a;
    }, []);

    let manifold = Array(n).fill().map( (_,i) => {
      return sizes.map( (s,j) => Math.floor( i / s ) % ls[j] );
    });

    return this.manifoldToGraph( manifold );
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
      throw new RangeError("[Random] Number of points must be between 10-1000.");
    if ( (dimension < 1) || (dimension > 20) )
      throw new RangeError("[Random] Dimension must be between 1-20.");
    if ( (connections < 1) || (connections > 100) )
      throw new RangeError("[Random] Connections must be between 1-100.");

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
        let dist = Rulial.d( points[i], points[j] );
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
  * Produces a complete graph with n vertices
  * @param {number} n Number of vertices
  * @param {number} d The number of egdes between vertices
  * @param {number} surface If true, connect only the surface
  * @return {number[][]} Edges
  */
  complete( n, d = 1, surface = false ) {
    let fibDistRef = 0.0; // Reference distance on a Fibonacci sphere
    if ( surface ) {
      fibDistRef = 1.1 * Rulial.fibonacciD(1,2,n,n);
      if ( (n < 5) || (n > 1000) )
        throw new RangeError("[Sphere] Number of vertices must be between 5-1000.");
    } else {
      if ( (n < 1) || (n > 100) )
        throw new RangeError("[Complete] Number of vertices must be between 1-100.");
    }

    let edges = [];
    let v = n;
    for( let i=0; i<n-1; i++ ) {
      for( let j=i+1; j<n; j++ ) {
        // Continue if the points are not near each other on a surface of a sphere
        if ( surface && Rulial.fibonacciD(i,j,n,n) > fibDistRef ) continue;

        // Random direction of the edge
        let [ a,b ] = Math.random() > 0.5 ? [i,j] : [j,i];

        let c = [ a, ...Array(d-1).fill().map( x => v++ ), b ];
        for( let k = 0; k < c.length-1; k++ ) {
          edges.push( [ c[k], c[k+1 ] ] );
        }
      }
    }

    return edges;
  }
}

export { Rulial };
