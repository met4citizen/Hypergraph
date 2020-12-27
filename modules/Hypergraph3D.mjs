import { HypergraphRewritingSystem } from "./HypergraphRewritingSystem.mjs";

class Hypergraph3D {

	// Init variables
	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	constructor() {
		this.hrs = new HypergraphRewritingSystem();
		this.graph3d = ForceGraph3D({ rendererConfig: { antialias: true, precision: "lowp" }});
		this.mode = "spatial"; // Displayed graph
		this.data = this.hrs.spatial; // Displayed graph
		this.pos = 0; // Log position
		this.updatetimer = null;
		this.stopfn = null;
	}

	/**
	 * Make pairs of an array, used to break hyperedges into pairs of two.
	 * @static
	 * @param {number[]} arr Array of numbers
	 * @return {number[][]} Array of pairs of numbers.
	 */
	static pairs( arr ) {
		const result = [];
		for ( let i = 0; i < (arr.length - 1); i++ ) result.push( [ arr[i], arr[i+1] ] );
		return result;
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 * @static
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	static hasDuplicates( arr ) {
		return ( arr.length !== new Set( arr ).size );
	}

	// Parse string based rules to array structure
	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	static parseRules( r ) {
		// Change parenthesis types and remove extra ones
		r = r.toLowerCase()
			.replace( /\{|\[/g , "(" ).replace( /}|]/g , ")" )
			.replace( /(\()+/g , "(" ).replace( /(\))+/g , ")" );

		// Discard all unsupported characters
		r = r.replace( /[^()a-z0-9,;>]+/g , "" );

		// To json format, '>' is the separator between lhr/rhs
		r = r.replace( /\),\(/g , ")(" )
			.replace( /^\(/g , "[{\"lhs\": [[\"" ).replace( /,/g , "\",\"" )
			.replace( /\);\(/g , "\"]]},{\"lhs\": [[\"" )
			.replace( /\)>\(/g , "\"]],\"rhs\": [[\"" )
			.replace( /\)\(/g , "\"],[\"" ).replace( /\)$/g , "\"]]}]" );

		// Nulls
		r = r.replace( /\[\[\"\"\]\]/g , "[]" );

		// JSON
		const s = JSON.parse( r );

		// Normalize each rule and sort
		let k, unique;
		s.forEach((v,i) => {
			const lhs = v.hasOwnProperty("lhs") ? v.lhs.flat() : [];
			const rhs = v.hasOwnProperty("rhs") ? v.rhs.flat() : [];
			const unique = [ ...new Set( [ ...lhs, ...rhs ] ) ];
			v.lhs.forEach( (w,j) => {
				for( k=0; k < w.length; k++ ) s[i].lhs[j][k] = unique.indexOf( w[k] );
			});
			v.lhs.sort( (a,b) => Math.min( ...a ) - Math.min( ...b ) );
			if ( v.hasOwnProperty("rhs") ) {
				v.rhs.forEach((w,j) => {
					for( k=0; k < w.length; k++ ) s[i].rhs[j][k] = unique.indexOf( w[k] );
				});
				v.rhs.sort( (a,b) => Math.min( ...a ) - Math.min( ...b ) );
			}
		});

		return s;
	}

	// Run abstract rewriting rules, return events
	run( rulestring, ruleOrdering = "mixed", eventOrdering = "random", maxevents = 500, progressfn = null, finishedfn = null ) {

		let rules, initial;

		// Check parameters
		if ( rulestring.length == 0 ) throw new SyntaxError("Given rule is empty.");
		try {
			rules = Hypergraph3D.parseRules( rulestring );
		}
		catch( e ) {
			throw new SyntaxError("Invalid rule format.");
		}
		if ( rules.length == 0 ) throw new SyntaxError("Parsing the rule failed.");

		// Set initial graph, use first lhs if not specified
		initial = rules[0].lhs;
		rules = rules.filter( v => !( (!v.hasOwnProperty("rhs") && (initial = v.lhs)) || ( v["lhs"].length == 0 && (initial = v.rhs) ) ) );

		this.hrs.run( rules, initial, ruleOrdering, eventOrdering, maxevents, progressfn, finishedfn );

	}

	// Cancel rewrite process
	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	cancel() {
		this.hrs.cancel();
	}

	// Run commands given in string format
	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	execute( str ) {
		// Change parenthesis types and remove extra ones
		str = str.toLowerCase()
			.replace( /\{|\[/g , "(" ).replace( /}|]/g , ")" )
			.replace( /(\()+/g , "(" ).replace( /(\))+/g , ")" );

		// Discard all unsupported characters
		str = str.replace( /[^()a-z0-9,.-;]+/g , "" );

		let cmds = str.split(";").map( c => [ ...c.split("(").map( p => [ ...p.replace( /[^a-z0-9,.-]+/g, "" ).split(",") ] ) ] );

		let v = [], e = [], p = [], r = [];
		let func, params, ret, isVertices, numParams = 1;
		cmds.forEach( c => {
			func = c[0][0];
			params = c[1];
			isVertices = false;
			numParams = 1;

			switch( func ) {
			case "path": case "line": case "geodesic":
				ret = this.data.geodesic( parseInt(params[0]), parseInt(params[1]), params.includes("dir"), params.includes("rev"), params.includes("all") ).flat();
				numParams = 2;
				break;
			case "nsphere": case "sphere":
				ret = this.data.nsphere( parseInt(params[0]), parseInt(params[1]), params.includes("dir"), params.includes("rev") );
				isVertices = true;
				break;
			case "nball": case "ball": case "tree":
				ret = this.data.nball( parseInt(params[0]), parseInt(params[1]), params.includes("dir"), params.includes("rev") );
				break;
			case "random": case "walk":
				ret = this.data.random( parseInt(params[0]), parseInt(params[1]), params.includes("dir"), params.includes("rev") );
				break;
			case "timeline": case "worldline":
				if ( this.mode !== "causal" ) throw new Error("Timeline only available in causal mode.");
				ret = this.data.worldline( parseInt(params[0]) );
				break;
			case "lightcone":
				if ( this.mode !== "causal" ) throw new Error("Lightcones only available in causal mode.");
				ret = this.data.lightcone( parseInt(params[0]), parseInt(params[1]) );
				break;
			default:
				throw new Error( "Unknown command: " + func );
			}

			for( let i = 0; i < numParams; i++ ) p.push( params[i] );
			if ( isVertices ) {
				r.push( ret.length );
				v = [ ...new Set( [ ...v, ...ret ] ) ];
			} else {
				e = [ ...new Set( [ ...e, ...ret ] ) ];
				let vertices = new Set( ret.flat() );
				r.push( vertices.size );
				v = [ ...new Set( [ ...v, ...vertices ] ) ];
			}

		});

		return { e: e, v: v, p: p, r: r };

	}

	// coordinates = { start, end }
	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	static linkPositionUpdate( linkObject, coordinates, link ) {
		if ( link.hyperedge ) {
			// This is hyperedge, update triangle coordinates
			const pos = link.mesh.geometry.attributes.position;
			pos.array[0] = link.source.x;
			pos.array[1] = link.source.y;
			pos.array[2] = link.source.z;
			pos.array[3] = link.middle.x;
			pos.array[4] = link.middle.y;
			pos.array[5] = link.middle.z;
			pos.array[6] = link.target.x;
			pos.array[7] = link.target.y;
			pos.array[8] = link.target.z;
			pos.needsUpdate = true;
		}
		return false;
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	setup( element, spatialStyles, causalStyles ) {
		this.spatialStyles = spatialStyles;
		this.causalStyles = causalStyles;
		this.graph3d( element )
		  .forceEngine('d3')
			.numDimensions( 3 )
			.showNavInfo( false )
			.enablePointerInteraction( true )
			.backgroundColor( this.spatialStyles[0]["bgColor"] )
			.nodeLabel( d => `<span class="nodeLabelGraph3d">${ d.id }</span>` )
			.nodeVisibility( 'refs' )
			.nodeOpacity( 1 )
			.linkOpacity( 1 );
		this.linkforcestrength = this.graph3d.d3Force("link").strength();
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	size( width, height ) {
		this.graph3d.width( width );
		this.graph3d.height( height );
	}

	// Add a hyperedge
	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	add( event, nodes, links ) {
		let k = { x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() - 0.5 };
		const { ["a"]: edge, ...props } = event;

		edge.forEach( n => { if (typeof nodes[n] !== 'undefined') k = nodes[n]; });

		if ( this.mode === "causal" ) {
			edge.forEach( (n,i) => {
				if (typeof nodes[n] === 'undefined') {
					nodes[n] = { id: n, refs: 1, x: k.x + 10 * Math.random(), y: k.y  + 10 * Math.random(), z: k.z  + 10 * Math.random(), style: 0 };
				} else {
					nodes[n].refs++;
				}
			});
			// Add link
			links.push({source: nodes[edge[0]], target: nodes[edge[1]], hyperedge: false, style: 0, ...props });
		} else {
			edge.forEach( (n,i) => {
				if (typeof nodes[n] === 'undefined') {
					nodes[n] = {id: n, refs: 1, x: k.x + (10 * Math.random() - 5) , y: k.y  + (10 * Math.random() - 5), z: k.z  + (10 * Math.random() - 5), style: 0 };
				} else {
					nodes[n].refs++;
				}
			});
			Hypergraph3D.pairs(edge).forEach( p => {
				let curv = 0.5;
				if (p[0] !== p[1]) {
					let idx = links.findIndex(l => l.source.id === p[0] && l.target.id === p[1] && !l.hyperedge);
					if (idx == -1) {
						// first link, keep straight
						curv = 0;
					} else {
						// existing link
						if (links[idx].curvature == 0) {
							// second link, switch values
							links[idx].curvature = 0.5;
							links[idx].rotations = 2 * Math.PI * Math.random();
							curv = 0;
						}
					}
				}

				// Add link
				links.push({source: nodes[p[0]], target: nodes[p[1]], hyperedge: false, style: 0, curvature: curv, rotation: (curv == 0 ? 0 : 2 * Math.PI * Math.random()), ...event });
			});

			// If hyperedge, fill with triangles and connect the two ends for force effect
			if ( edge.length > 2 ) {
				if ( Hypergraph3D.hasDuplicates( edge ) ) {
					// This has a self-loop
					// TODO: circle ?
				} else {
					// No self-loop
					// Triangle
					const geom = new THREE.BufferGeometry();
					const positions = new Float32Array([
						nodes[ edge[edge.length-1] ].x, nodes[ edge[edge.length-1] ].y, nodes[ edge[edge.length-1] ].z,
						nodes[ edge[1] ].x, nodes[ edge[1] ].y, nodes[ edge[1] ].z,
						nodes[ edge[0] ].x , nodes[ edge[0] ].y, nodes[ edge[0] ].z
					]);
					const normals = new Float32Array(9);
					geom.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
					geom.setAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
					geom.computeVertexNormals();

	  			const mat = new THREE.MeshStandardMaterial( { color: this.spatialStyles[4].fill, transparent: true, opacity: this.spatialStyles[4].opacity, side: THREE.DoubleSide } );
	  			const mesh = new THREE.Mesh(geom, mat);
	  			this.graph3d.scene().add(mesh);

		  			// Hyperedge link
					links.push({source: nodes[edge[edge.length-1]], target: nodes[edge[0]], middle: nodes[edge[1]], hyperedge: true, selfloop: false, mesh: mesh, style: 4, curvature: 0, rotation: 0 });
				}
			}
		}
	}

	// Remove a hyperedge
	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	remove( event, nodes, links ) {
		// Remove by decreasing the reference number; nodes with ref 0 get hidden
		const { ["x"]: edge, ...props } = event;

		edge.forEach( n => nodes[n].refs-- );

		// Remove the first link
		Hypergraph3D.pairs( edge ).forEach( p => {
			let idx = links.findIndex(l => l.source.id === p[0] && l.target.id === p[1] && !l.hyperedge);
			if ( idx !== -1 ) links.splice( idx, 1 );
		});

		// Remove the hyperedge, if this a hyperedge
		if ( edge.length > 2 ) {
			if ( Hypergraph3D.hasDuplicates( edge ) ) {
				// This has a self-loop
			} else {
				let idx = links.findIndex( l => l.hyperedge && l.source.id === edge[edge.length-1] && l.target.id === edge[0] && l.middle.id === edge[1] );
				if ( idx !== -1 ) {
					// Remove filled hyperedge
					this.graph3d.scene().remove( links[ idx ].mesh );
					links[ idx ].mesh.geometry.dispose();
					links[ idx ].mesh.material.dispose();
					links[ idx ].mesh = undefined;

					// Remove link
					links.splice( idx, 1 );
				}
			}
		}
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	reset( mode = "spatial" ) {
		// Stop animation and set position to start
		this.stop();
		this.pos = 0;

		// Remove hyperedges; empty nodes and links
		let { nodes, links } = this.graph3d.graphData();
		links.forEach( l => {
			if ( l.hyperedge ) {
				this.graph3d.scene().remove( l.mesh );
				l.mesh.geometry.dispose();
				l.mesh.material.dispose();
				l.mesh = undefined;
			}
		});
		nodes = [ { id: 0, refs: 0, style: 0, x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() - 0.5 } ];
		links = [];
		this.graph3d.graphData({ nodes, links });

		// Initialize
		if ( mode === "spatial" ) {
			this.mode = "spatial";
			this.data = this.hrs.spatial;
			this.graph3d
				.dagMode( null )
				.backgroundColor( this.spatialStyles[0]["bgColor"] )
				.nodeRelSize( this.spatialStyles[0]["nRelSize"] )
				.nodeVal( d => (d.big ? 14 : 1) * this.spatialStyles[d.style]["nVal"] )
				.nodeColor( d => this.spatialStyles[d.style]["nColor"] )
				.linkLabel( null )
				.linkWidth( d => this.spatialStyles[d.style]["lWidth"] )
				.linkColor( d => this.spatialStyles[d.style]["lColor"] )
				.linkPositionUpdate( Hypergraph3D.linkPositionUpdate )
				.linkCurvature( 'curvature' )
				.linkCurveRotation( 'rotation' )
				.linkDirectionalArrowLength(0);
			this.graph3d.d3Force("center").strength( 1 );
			this.graph3d.d3Force("link").strength( this.linkforcestrength );
			// First additions
			while( this.pos < this.data.events.length && this.data.events[ this.pos ].hasOwnProperty('a') && this.tick() );
		} else if ( mode === "causal" ) {
			this.mode = "causal";
			this.data = this.hrs.causal;
			this.graph3d
				.dagMode( "zout" )
				.backgroundColor( this.causalStyles[0]["bgColor"] )
				.nodeRelSize( this.causalStyles[0]["nRelSize"] )
				.nodeVal( d => (d.big ? 14 : 1) * this.causalStyles[d.style]["nVal"] )
				.nodeColor( d => this.causalStyles[d.style]["nColor"] )
				.linkLabel( d => `<span class="linkLabelGraph3d">${ "[" + d.step.toString()+ "] " + d.mod }</span>` )
				.linkWidth( d => this.causalStyles[d.style]["lWidth"] )
				.linkColor( d => this.causalStyles[d.style]["lColor"] )
				.linkPositionUpdate( null )
				.linkCurvature( null )
				.linkCurveRotation( null )
				.linkDirectionalArrowLength(15)
				.linkDirectionalArrowRelPos(1);
			this.graph3d.d3Force("center").strength( 0.2 );
			this.graph3d.d3Force("link").strength( 0.8 );
		}
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	tick( steps = 1 ) {
		let { nodes, links } = this.graph3d.graphData();
		for( let i = steps; i > 0; i-- ) {
			if ( this.pos >= this.data.events.length ) {
				this.graph3d.graphData( { nodes, links } );
				return false;
			}
			if ( this.data.events[ this.pos ].hasOwnProperty('a') ) {
				this.add( this.data.events[ this.pos ], nodes, links );
			} else if ( this.data.events[ this.pos ].hasOwnProperty('x') ) {
				this.remove( this.data.events[ this.pos ], nodes, links );
			}
			this.pos++;
		}
		this.graph3d.graphData( { nodes, links } );
		return true;
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	update = () => {
		const steps = Math.min( 50, Math.ceil( ( this.pos + 1 ) / 10) );
		if ( !this.tick( steps ) ) {
			this.stop();
			if ( this.stopfn ) this.stopfn();
		}
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	play( msec, stopcallback = null ) {
		this.graph3d.enablePointerInteraction( false );
		if ( this.updatetimer ) clearInterval( this.updatetimer );
		this.stopfn = stopcallback;
		this.updatetimer = setInterval( this.update, msec );
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	speed( msec ) {
		if ( this.updatetimer ) {
			clearInterval( this.updatetimer );
			this.updatetimer = setInterval( this.update, msec );
		}
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	stop() {
		if ( this.updatetimer ) {
			clearInterval( this.updatetimer );
			this.updatetimer = null;
			this.graph3d.enablePointerInteraction( true );
		}
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	final() {
		this.stop();
		this.tick( this.data.events.length );
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	setHighlight( subgraph, style ) {
		let { nodes, links } = this.graph3d.graphData();

		// Big Vertices
		if ( subgraph.hasOwnProperty("p") ) {
			subgraph['p'].forEach( n => {
				if ( typeof nodes[n] !== 'undefined' ) nodes[n].big = true;
			});
		}

		// Vertices
		if ( subgraph.hasOwnProperty("v") ) {
			subgraph['v'].forEach( n => {
				if ( typeof nodes[n] !== 'undefined' ) nodes[n].style = nodes[n].style | style;
			});
		}

		// Hyperedges
		if ( subgraph.hasOwnProperty("e") ) {
			subgraph['e'].forEach(e => {
				Hypergraph3D.pairs(e).forEach( p => {
					let idx = links.findIndex(l => l.source.id === p[0] && l.target.id === p[1] && !l.hyperedge );
					if (idx !== -1) links[ idx ].style = links[ idx ].style | style;
				});
			});
		}

		this.graph3d.graphData({ nodes, links });
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	clearHighlight( style ) {
		let { nodes, links } = this.graph3d.graphData();
		nodes.forEach( n => n.style = n.style & ~style );
		links.forEach( l => l.style = l.style & ~style );
		this.graph3d.graphData({ nodes, links });
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	static download(content, fileName, contentType) {
		const a = document.createElement("a");
		const file = new Blob([content], { type: contentType });
		a.href = URL.createObjectURL(file);
		a.download = fileName;
		a.click();
	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	export( binary = true ) {
		// Instantiate a exporter
		const exporter = new THREE.GLTFExporter();
		const options = { onlyVisible: true, binary: binary };

		exporter.parse( this.graph3d.scene(), function (result) {
			if ( binary ) {
				Hypergraph3D.download( result, 'hypergraph.glb', "octet/stream" );
			} else {
				var output = JSON.stringify(result, null, 2);
				Hypergraph3D.download( output, 'hypergraph.gltf', 'application/json');
			}
		}, options);

	}

	/**
	 * Test whether array of numbers has duplicate values.
	 *
	 * @param {numbers[]} edge Array of vertices
	 * @return {boolean} True if array has duplicates.
	 */
	status() {
		return { ...this.data.status(), ...this.hrs.status() };
	}

}

export { Hypergraph3D };
