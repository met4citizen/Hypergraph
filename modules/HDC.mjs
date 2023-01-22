
/**
* @class Hyperdimensional computing using 10,240-D dense bipolar vectors.
* @author Mika Suominen
*/
class HDC {

	/**
	* @typedef {Uint32Array} Hypervector
	*/

	/**
	* Creates an instance of the class.
	* @constructor
	*/
	constructor() {
	}

	/**
	* Create a new random hypervector.
	* @static
	* @return {Hypervector}
	*/
	static random() {
		const v = new Uint32Array(320);
		window.crypto.getRandomValues(v);
		return v;
	}

	/**
	* Elementwise XOR '*'.
	* @static
	* @param {Hypervector[]} vs Array of hypervectors.
	* @return {Hypervector} Result hypervector.
	*/
	static xor(vs) {
		const v = new Uint32Array(320);
		for( let i=0; i<320; i++ ) {
			v[i] = vs.reduce( (a,b) => (a ^ b[i]) >>> 0, 0 );
		}
		return v;
	}

	/**
	* Elementwise majority (sum, '+').
	* @static
	* @param {Hypervector[]} vs Array of hypervectors.
	* @return {Hypervector} Result hypervector.
	*/
	static maj(vs) {
		let v = new Uint32Array(320);
		if ( vs.length % 2 === 0 ) {
			window.crypto.getRandomValues(v); // Solve ties with random bits
			vs.push(v);
		}
		switch( vs.length ) {
			case 1:
				for( let i=0; i<320; i++ ) v[i] = vs[0][i];
				break;
			case 3:
				for( let i=0; i<320; i++ ) {
					v[i] = ( (vs[0][i] & vs[1][i]) |
						(vs[0][i] & vs[2][i]) |
						(vs[1][i] & vs[2][i]) ) >>> 0;
				}
				break;
			case 5:
				for( let i=0; i<320; i++ ) {
					v[i] = ( (vs[0][i] & vs[1][i] & vs[2][i]) |
						(vs[0][i] & vs[1][i] & vs[3][i]) |
						(vs[0][i] & vs[1][i] & vs[4][i]) |
						(vs[0][i] & vs[2][i] & vs[3][i]) |
						(vs[0][i] & vs[2][i] & vs[4][i]) |
						(vs[0][i] & vs[3][i] & vs[4][i]) |
						(vs[1][i] & vs[2][i] & vs[3][i]) |
						(vs[1][i] & vs[2][i] & vs[4][i]) |
						(vs[1][i] & vs[3][i] & vs[4][i]) |
						(vs[2][i] & vs[3][i] & vs[4][i]) ) >>> 0;
				}
				break;
			default:
				for( let i=0; i<320; i++ ) {
					let val = 0;
					for (let mask = 1; mask; mask = mask << 1 >>> 0) {
						let sum = 0;
						for (let k = vs.length-1; k>=0; k--) {
							sum += (vs[k][i] & mask) ? 1 : -1;
						}
						if ( sum > 0 ) {
							val += mask;
						} else if ( sum === 0 ){
							val += (v[i] & mask) >>> 0;
						}
					}
					v[i] = val;
				}
		}
		return v;
	}

	/**
	* Permutation i.e. bitwise rotation.
	* @static
	* @param {Hypervector} v
	* @param {number} n Number of rotations, sign for direction.
	* @return {Hypervector} Rotated hypervector.
	*/
	static rot( v, n=1 ) {
		const bitstr = v.reduce( (a,b) => a + b.toString(2).padStart(32, '0'), "");
		const rotstr = bitstr.slice(n) + bitstr.slice(0,n);
		const r = new Uint32Array(320);
		for( let i=0; i<320; i++ ) {
			r[i] = parseInt(rotstr.slice(i*32,i*32+32),2);
		}
		return r;
	}

	/**
	* Distance between two hypervector.
	* @static
	* @param {Hypervector} v1
	* @param {hypervector} v2
	* @return {number} Distance.
	*/
	static d( v1, v2 ) {
		let sum = 0;
		for( let i=0; i<320; i++) {
			let n = (v1[i] ^ v2[i]);
			n = n - ((n >>> 1) & 0x55555555);
	  	n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
	  	sum += ((n + (n >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
		}
		return sum;
	}

}

export { HDC };
