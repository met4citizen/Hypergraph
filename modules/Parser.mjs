import { HDC } from "./HDC.mjs";
import { Rewriter } from "./Rewriter.mjs";

/**
* @class The space of all rewriting rules.
* @author Martin Coll
*/
class Parser {

  /**
  * Creates an instance of Parser.
  * @constructor
  */
  constructor() {
    this.rules = []; // rewriting rules
    this.commands = []; // commands
    this.initial = []; // initial graphs
  }

  /**
  * Clear the Parser for reuse.
  */
  clear() {
    this.rules.length = 0; // rewriting rules
    this.commands.length = 0; // commands
    this.initial.length = 0; // initial graphs
  }

  /**
  * Parse command string (can be ; separated)
  * @param {string} str
  * @return {Object[]} [ { cmd: "", params: ["1","2"] }, ... ]
  */
  parseCommands( str ) {
    // Extract quoted strings
    let req = /(["'])((?:\\\1|(?:(?!\1)).)*)(\1)/g;
    let q = str.match( req ) || [];
    let qfn = () => { return q.shift(); };

    str = str.replace( req, "''" ).toLowerCase()
    .replace( /\}\}\,\{\{/g, "}};{{")
    .replace( /\{|\[/g , "(" ).replace( /}|]/g , ")" )
    .replace( /(\()+/g , "(" ).replace( /(\))+/g , ")" )
    .replace( /(;)+/g , ";" ).replace( /;$/g ,"" )
    .replace( /[^()a-z0-9,=;>\.\-\\\/'%]+/g , "" );

    let cs = [];
    str.split(";").forEach( s => {
      let x = s.match( /^([^(]+)/ );
      let c = x ? x[0] : "";
      let ps = [], opt = "";
      if ( c === '' ) {
        x = s.match( /\/([^/]*)$/ );
        opt = x ? x[1] : "";
        if (opt.length) s = s.slice(0, -(opt.length+1) );
        ps.push( s.replace( /''/g, qfn ) );
      } else {
        x = s.match( /\/([^/]*)$/ );
        opt = x ? x[1] : "";
        x = s.match( /\((.*)\)/s );
        if ( x && x[1].length ) {
          ps = x[1].split(",").map( t => t.replace( /''/g, qfn ) );
        }
      }
      cs.push( { cmd: c, params: ps, opt: opt } );
    });

    return cs;
  }

  /**
  * Parse rules.
  * @param {string[]} str Array of rule strings
  * @return {Object[]} [ { lhs, rhs, neg, delmask, addmask}, ... ]
  */
  parseRules( str ) {
    const rules = [];
    let sfn = (e) => { return e.split(","); };
    let jfn = (e) => { return e.join(","); };

    str.forEach( s => {
      let c = s.toLowerCase()
      .replace( /\{|\[/g , "(" ).replace( /}|]/g , ")" )
      .replace( /(\()+/g , "(" ).replace( /(\))+/g , ")" )
      .replace( /(;)+/g , ";" ).replace( /;$/g ,"" )
      .replace( /(=)+/g , "=" ).replace( /[^()a-z0-9,=;>\\\/]+/g , "" );

      let o = [ [], [], [],[] ]; // lhs, rhs, lhsneg, rhsneg
      let i = 0, rhs = 0, neg = 0, twoway = false;
      while ( i < c.length ) {
        switch( c[i] ) {
          case '(':
            let x = c.substring(i).match( /\(([^)]+)\)/s );
            if ( x ) {
              o[ neg + rhs ].push(x[1]);
              i += x[0].length - 1;
            }
            break;
          case '\\': neg = 2; break;
          case '=': twoway = true;
          case '>': neg = 0; rhs = 1;
        }
        i++;
      }
      if ( rhs ) {
        const r = { lhs: o[0].map( sfn ),rhs: o[1].map( sfn ) };
        if ( o[2].length ) r.neg = o[2].map( sfn );
        rules.push( r );
        if ( twoway ) {
          const r2 = { lhs: o[1].map( sfn ), rhs: o[0].map( sfn ) };
          if ( o[3].length ) r2.neg = o[3].map( sfn );
          rules.push( r2 );
        }
      }
    });

    // Post-process
    for( let i=rules.length-1; i >=0; i-- ) {
      let r = rules[i];

      // Normalize
      const u = [ ...new Set( Object.values(r).flat().flat() ) ];
      Object.keys(r).forEach( k => {
        for( let j=0; j < r[k].length; j++ ) {
          for( let l=0; l < r[k][j].length; l++) r[k][j][l] = u.indexOf( r[k][j][l] );
        }
      });

      // Map templates
      r.lhsmap = [...new Set( r.lhs.flat() )].fill( -1 );
      if ( r.neg ) r.negmap = [...new Set( [...r.lhs.flat(),...r.neg.flat()])].fill( -1 );
      let lhsall = r.lhs.map( e => e.join(","));
      let rhsall = r.rhs.map( e => e.join(","));
      r.lhsdup = lhsall.map( e => rhsall.includes(e) );
      r.rhsdup = rhsall.map( e => lhsall.includes(e) );

      // Calculate physical Values
      r.energy = r.lhs.length + r.rhs.length; // Hypothesis: energy is # of edges
      let maxlhsv = r.lhsmap.length - 1;
      let masses = r.rhs.filter( e => e.every( v => v <= maxlhsv ) );
      let massratio = masses.length ? (masses.length / r.rhs.length) : 1;
      r.mass = r.energy * massratio;
  		r.momentum = r.energy * ( 1 - massratio );
      let lhsrevs = r.lhs.map( e => e.slice().reverse().join(",") );
      r.spin = lhsrevs.reduce( (a,b) => a + rhsall.includes(b) ? 1 : 0, 0 );

      // Branchial coordinate (basis)
      r.bc = HDC.random();

    }

    return rules;
  }

  /**
  * Produces initial graph from rule.
  * @param {string} str Rule string
  * @param {number} n Maximum number of events.
  * @return {number[][]} Edges
  */
  rule( str, n ) {
    if ( (n < 10) || (n > 1000) )
      throw new RangeError("[Rule] Max # of events must be between 10-1000.");

    // Run the given rule in singleway spacelike mode for n events
    let h = new Rewriter();
    h.run( str, {
      evolution: 1,
      interactions: 1,
      maxevents: n,
      deduplicate: false,
      merge: false,
      pathcnts: false,
			bcoordinates: false,
      knn: 0
    });
    let leafs = h.multiway.T.filter( t => t.child.length === 0 ).map( t => t.edge );

    return leafs;
  }

  /**
  * Parse rule/command from a string.
  * @param {string} str Rule/command string
  */
  setRule( str ) {
    // Reset
    this.clear();

    // Check if empty
    if ( str.length === 0 ) throw new RangeError("Given rule is empty.");

    // Parse commands and rules
    [ this.rules, this.commands ] = this.parseCommands( str ).reduce( (a,b) => {
      if ( b.cmd === '' ) {
        let r = this.parseRules( b.params );
        if ( r.length ) {
          r.forEach( x => x.opt = b.opt );
          a[0].push( ...r ); // rule
        } else {
          a[1].push(b); // initial state
        }
      } else {
        a[1].push(b); // command
      }
      return a;
    }, [[],[]]);

    // Set ids
    this.rules.forEach( (r,i) => r.id = i );

    // Process commands
    let idx = this.commands.findIndex( x => x.cmd === "prerun" );
    if ( idx !== -1 ) {
      // Process pre-run and other commands with it
      let c = this.commands[idx];
      let cmd = c.cmd;
      let p = c.params;
      if ( p.length < 1 ) throw new TypeError("Prerun: Invalid number of parameters.");
      let branch = c.opt.length ? parseInt(c.opt) : 0;
      if ( branch < 0 || branch > 16 ) throw new RangeError("Option '/': Branch must be between 0-16.");
      let rule = this.getRule(";");
      rule = rule.replace( /;prerun[^;]+/g, "" ); // filter out to avoid recursion
      let edges = this.rule( rule, parseInt(p[0]) || 10 );
      this.initial.push( { edges: edges, b: branch } );
    } else {
      // Process commands
      let negedges = []; // Edges to be removed from the final set
      this.commands.forEach( c => {
        let cmd = c.cmd;
        let p = c.params;
        let branch = c.opt.length ? parseInt(c.opt) : 0;
        if ( branch < 0 || branch > 16 ) throw new RangeError("Option '/': Branch must be between 0-16.");
        let edges = [];

        switch( cmd ) {
          case "": // initial graph
            let [pos,neg] = p[0].split("\\");
            if ( pos ) {
              edges = pos.split("(").map( p => [ ...p.replace( /[^-a-z0-9,\.]+/g, "" ).split(",") ] ).slice(1);
            }
            if ( neg ) {
              negedges.push( { edges: neg.split("(").map( p => p.replace( /[^-a-z0-9,\.]+/g, "" ) ).slice(1), b: branch } );
            }
            break;
          case "rule":
            if ( p.length < 2 ) throw new TypeError("Rule: Invalid number of parameters.");
            edges = this.rule( p[0].slice(1, -1) || "", parseInt(p[1]) || 10 );
            break;
          case "points":
            if ( p.length < 1 ) throw new TypeError("Points: Invalid number of parameters.");
            edges = this.points( parseInt(p[0]) || 1 );
            break;
          case "line":
            if ( p.length < 1 ) throw new TypeError("Line: Invalid number of parameters.");
            edges = this.grid( [ parseInt(p[0]) || 1 ] );
            break;
          case "grid": case "ngrid":
            if ( p.length < 1 ) throw new TypeError("Grid: Invalid number of parameters.");
            edges = this.grid( p.map( x => parseInt(x) ).filter(Boolean) );
            break;
          case "sphere":
            if ( p.length < 1 ) throw new TypeError("Sphere: Invalid number of parameters.");
            edges = this.complete( parseInt(p[0]) || 10, 1, true );
            break;
          case "random":
            if ( p.length < 3 ) throw new TypeError("Random: Invalid number of parameters.");
            edges = this.random( parseInt(p[0]) || 10, parseInt(p[1]) || 3, parseInt(p[2]) || 3 );
            break;
          case "complete":
            if ( p.length < 1 ) throw new TypeError("Complete: Invalid number of parameters.");
            edges = this.complete( parseInt(p[0]) || 10 );
            break;
          default:
            throw new TypeError( "Unknown command: " + c.cmd );
        }

        // If oneway option specified, sort edges
        if ( p.includes("oneway") ) {
          edges = edges.map( x => x.sort( (a,b) => a - b ) );
        }

        // If twoway option specified, make each edge a two-way edge
        if ( p.includes("twoway") ) {
          edges = edges.map( x => [x,x.slice().reverse()] ).flat();
        }

        // If inverse option specified, invert each edge
        if ( p.includes("inverse") ) {
          edges = edges.map( x => x.reverse() );
        }

        this.initial.push( { edges: edges, b: branch } );
      });

      // Remove negative edges
      negedges.forEach( x => {
        this.initial.forEach( y => {
          if ( x.b === 0 || y.b === 0 || (x.b & y.b) ) {
            y.edges = y.edges.filter( z => !x.edges.includes( z.join(",") ) );
          }
        })
      });

    }

    // Use first lhs as the initial state, if not specified
    // Note: replace all vertices with pattern 1, e.g. (1,2) => (1,1)
    if ( this.rules.length && this.initial.length === 0 ) {
      let edges = this.rules[0].lhs.map( e => e.map( x => 1 ));
      this.initial.push( { edges: edges, b: 0 } );
    }

    // Normalize initial states
    let u = [];
    this.initial.forEach( i => {
      let v = i.edges.flat().sort((a,b) => a-b ).map(String);
      u = [ ...new Set( [...u, ...v ] ) ]
      i.edges = i.edges.map( e => e.map(String) );
    });
    this.initial.forEach( i => {
      i.edges = i.edges.map( e => e.map( x => u.indexOf( x ) ) );
    })

    if ( this.initial.length === 0 ) {
      throw new TypeError("Parsing the rule failed.");
    }

  }

  /**
  * Return rule as a string.
  * @param {string} [sep="<br>"] Separator for rules
  * @return {string} Rule as a string.
  */
  getRule( sep = "<br>" ) {
    let s = "";
    let ef = (e) => { return s += "(" + e.map( v => v + 1 ).join(",") + ")"; };

    // Rules
    this.rules.forEach( r => {
      if ( s.length ) s += sep;
      r.lhs.forEach( ef );
      if ( r.hasOwnProperty("neg") && r.neg.length > 0 ) {
        s += "\\";
        r.neg.forEach( ef );
      }
      s += "->";
      if ( r.rhs.length === 0 ) {
        s += "()";
      } else {
        r.rhs.forEach( ef );
      }
      if ( r.opt && r.opt.length > 0 ) s += "/" + r.opt;
    });

    // Commands and initial graphs
    this.commands.forEach( c => {
      if ( s.length ) s += sep;
      s += (c.cmd === "") ? c.params : (c.cmd + "(" + c.params.join(",") + ")");
      if ( c.opt && c.opt.length > 0 ) s += "/" + c.opt;
    });

    return s;
  }

}

export { Parser };
