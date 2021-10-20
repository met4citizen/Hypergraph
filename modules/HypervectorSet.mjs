
/**
* @class Hypervector Set using Dense Bipolar Hypervectors.
* @author Mika Suominen
*/
class HypervectorSet extends Set {

	/**
	* @typedef {Uint8Array} Hypervector
	*/

	/**
	* Creates an instance of the class.
	* @param {Object} iterable
	* @param {number} [bytes=1280] Vector length in bytes, 1 byte = 8 bits
	* @constructor
	*/
	constructor(iterable=null,bytes=1280) {
		super();

		if ( !Number.isInteger(bytes) || bytes < 1 ) {
			throw new TypeError("Invalid vector size.");
		}
		this.bytes = bytes;

		if ( iterable ) {
			if ( !Array.isArray(iterable) ) {
				throw new TypeError("Not an iterable array.");
			}
			iterable.forEach(this.add,this);
		}

		// Hamming distance table for Uint8, pre-calculated for speed
		this.hamm =  [[]];
		for( let i=0; i<256; i++ ) {
			this.hamm[i]=new Uint8Array(256);
			for( let j=0; j<256; j++ ) {
				this.hamm[i][j] = [1,2,4,8,16,32,64,128].filter(x => (i & x) !== (j & x) ).length;
			}
		}
	}

	/**
	* Clear the hypervector for reuse.
	*/
	clear() {
		super.clear();
	}

	/**
	* Create a new random hypervector.
	* @return {Hypervector}
	*/
	random() {
		const v = new Uint8Array(this.bytes);
		window.crypto.getRandomValues(v);
		return v;
	}

	/**
	* Elementwise XOR '*'.
	* @param {Hypervector[]} vs Array of hypervectors.
	* @return {Hypervector} Result hypervector.
	*/
	xor(vs) {
		if ( !Array.isArray(vs) ) {
			throw new TypeError("Not an iterable array.");
		}
		if ( vs.some( v => !(v instanceof Uint8Array && v.length === this.bytes) ) ) {
			throw new TypeError("Not a hypervector.");
		}
		let v = new Uint8Array(this.bytes);
		for( let i=this.bytes-1; i>=0; i-- ) {
			v[i] = vs.reduce( (a,b) => a ^ b[i], 0 );
		}
		return v;
	}

	/**
	* Elementwise majority (sum, '+').
	* @param {Hypervector[]} vs Array of hypervectors.
	* @return {Hypervector} Result hypervector.
	*/
	maj(vs) {
		if ( !Array.isArray(vs) ) throw new TypeError("Not an iterable array.");
		if ( vs.some( v => !(v instanceof Uint8Array && v.length === this.bytes) ) ) {
			throw new TypeError("Not a hypervector.");
		}
		let v = new Uint8Array(this.bytes);
		if ( v.length % 2 === 0 ) window.crypto.getRandomValues(v); // Solve ties with random bits
		for( let i=this.bytes-1; i>=0; i-- ) {
      for (let mask = 1; mask <= 128; mask <<= 1) {
        let sum = 0;
        for (let k = vs.length-1; k>=0; k--) {
					sum += (vs[k][i] & mask) ? 1 : -1;
        }
				if (sum>0) v[i] |= mask;
			}
		}
		return v;
	}

	/**
	* Permutation i.e. bitwise rotation.
	* @param {Hypervector} v
	* @param {number} n Number of rotations, sign for direction.
	* @return {Hypervector} Rotated hypervector.
	*/
	rot( v, n=1 ) {
		if ( !(v instanceof Uint8Array && v.length === this.bytes) ) {
			throw new TypeError("Not a hypervector.");
		}
		let bitstr = v.reduce( (a,b) => a + b.toString(2).padStart(8, '0'), "");
		let rotstr = bitstr.slice(n) + bitstr.slice(0,n);
		let r = new Uint8Array(this.bytes);
		for( let i=this.bytes-1; i>=0; i-- ) {
			r[i] = parseInt(rotstr.slice(i*8,i*8+8),2);
		}
		return r;
	}

	/**
	* Add hypervectors to HAM.
	* @param {Hypervector} vs Array of hypervectors.
	*/
	add(v) {
		if ( !(v instanceof Uint8Array && v.length === this.bytes) ) {
			throw new TypeError("Not a hypervector.");
		}
		super.add(v);
	}

	/**
	* Delete hypervectors from HAM.
	* @param {Hypervector} v
	*/
	delete(v) {
		if ( !(v instanceof Uint8Array && v.length === this.bytes) ) {
			throw new TypeError("Not a hypervector.");
		}
		super.delete(v);
	}

	/**
	* Distance between two hypervectors.
	* @param {Hypervector} v1
	* @param {hypervector} v2
	* @return {number} Distance.
	*/
	d( v1, v2 ) {
		if ( !(v1 instanceof Uint8Array && v1.length === this.bytes) ||
				 !(v2 instanceof Uint8Array && v2.length === this.bytes) ) {
			throw new TypeError("Not a hypervector.");
		}
		return v1.reduce( (a,x,i) => a + this.hamm[x][v2[i]], 0);
	}

	/**

	/**
	* Nearest Neighbours of a hypervector using Hamming distance.
	* @param {Hypervector} v
	* @param {number} [maxnum=Infinity] Maximum number of neighbours.
	* @param {number} [maxd=Infinity] Maximum distance.
	* @return {object[]} Sorted array of { id, d } from near to far.
	*/
	nn( v, maxnum=Infinity, maxd=Infinity ) {
		if ( !(v instanceof Uint8Array && v.length === this.bytes) ) {
			throw new TypeError("Not a hypervector.");
		}
		let n=[];
		for( let v2 of this ) {
			if ( v === v2 ) continue;
			let d = v.reduce( (a,x,i) => a + this.hamm[x][v2[i]], 0);
			if ( d <= maxd ) n.push( { v: v2, d: d } );
		}
		n.sort( (a,b) => a.d - b.d );
		return n.slice(0,maxnum);
	}

}

export { HypervectorSet };
