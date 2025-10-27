/**
* MIT License
*
* Copyright (c) 2025 Mika Suominen
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/


/**
* Hyperdimensional computing using dense binary hypervectors.
*
* @class 
* @author Mika Suominen
*
* The general idea of HDC is based on Pentti Kanerva's work on
* Hyperdimensional computing [1].
*
* [1] Kanerva, P. (2019). Computing with High-Dimensional Vectors.
*     IEEE Design & Test, 36(3):7–14.
*/

class HDC {

	/**
	* @typedef {Uint32Array} Hypervector Dense binary hypervector
	*/

	/**
	* Creates an instance of the class.
	*
	* @constructor
	* @param {number} [dimension=10240] Dimension of the hypervectors, must be a multiple of 32.
	* @param {number} [checks=false] If true, checks all the input parameters.
	*/
	constructor(dimension=10240, checks=false) {
		
		// Dimension and Uint32Array size
		this.dimension = dimension;
		if (this.dimension < 32 || (this.dimension % 32 !== 0) ) {
      throw new Error('Dimension must a multiple of 32.');
		}
		this.arraySize = this.dimension / 32;

		// Checks
		this.isChecks = !!checks;

		// Check for crypto and Buffer
		this.isCrypto = !!globalThis.crypto;
		this.isBuffer = typeof Buffer !== 'undefined';

		// Precompute look-up tables
		this.bitcountLookup = new Uint8Array(256);
		this.b64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		this.b64Lookup = new Uint8Array(256);
		this.binarystringLookup = new Array(256);
		for( let i = 0; i < 256; i++ ) {
			this.bitcountLookup[i] = (i & 1) + this.bitcountLookup[i >> 1];
			this.b64Lookup[this.b64Chars.charCodeAt(i)] = i;
			this.binarystringLookup[i] = i.toString(2).padStart(8, '0');
		}

	}

	/**
	* Check whether the parameter is a valid hypervector
	* with correct dimension.
	* 
	* @param {Hypervector} v Hypervector candidate
	* @return {boolean} If true, this is a valid hypervector.
	*/
	isHypervector(v) {
		return (v instanceof Uint32Array && v.length === this.arraySize);
	}

	/**
	* Check if two hypervectors are equal.
	* 
	* @param {Hypervector} v1 Hypervector 1
	* @param {Hypervector} v2 Hypervector 1
	* @return {boolean} If true, hypervectors are equal.
	*/
	isEqual(v1, v2) {
		if ( this.isChecks ) {
			if ( !this.isHypervector(v1) ) {
				throw new Error('First parameter is not a valid hypervector.');
			}
			if ( !this.isHypervector(v2) ) {
				throw new Error('Second parameter is not a valid hypervector.');
			}
		}

    if (v1 === v2) return true; // same reference
		const N = this.arraySize;
    for (let i = 0; i < N; i++) {
        if (v1[i] !== v1[i]) return false;
    }
    return true;
	}

	/**
	* Clones the hypervector.
	* 
	* @param {Hypervector} v
	* @param {Hypervector} [r=null] Pre-allocated result vector.
	* @return {Hypervector}
	*/
	copy(v, r=null) {
		if ( this.isChecks ) {
			if ( !this.isHypervector(v) ) {
				throw new Error('Not a valid hypervector.');
			}
			if ( r && !this.isHypervector(r) ) {
				throw new Error('Result	is not a valid hypervector.');
			}
		}
		
		if ( r ) {
			r.set(v);
			return r;
		} else {
			return new Uint32Array(v);
		}
	}

	/**
	* Create a new empty hypervector (all zeros).
	* 
	* @return {Hypervector}
	*/
	empty() {
		return new Uint32Array(this.arraySize);
	}

	/**
	* Invert hypervector.
	* 
	* @param {Hypervector} v
	* @param {Hypervector} [r=null] Pre-allocated result vector.
	* @return {Hypervector} Inverted hypervector.
	*/
	invert(v, r=null) {
		if ( this.isChecks ) {
			if ( !this.isHypervector(v) ) {
				throw new Error('Not a valid hypervector.');
			}
			if ( r && !this.isHypervector(r) ) {
				throw new Error('Result	is not a valid hypervector.');
			}
		}

		const N = this.arraySize;
		const w = r || new Uint32Array(N);
		for (let i = 0; i < N; i++) w[i] = ~v[i];
		return w;
	}

	/**
	* Create a new random hypervector.
	* 
	* @param {Hypervector} [r=null] Pre-allocated result vector.
	* @return {Hypervector}
	*/
	random(r=null) {
		if ( this.isChecks ) {
			if ( r && !this.isHypervector(r) ) {
				throw new Error('Result	is not a valid hypervector.');
			}
		}

		const N = this.arraySize;
		const v = r || new Uint32Array(N);
		
		if ( this.isCrypto ) {
			globalThis.crypto.getRandomValues(v);
		} else {
			for (let i = 0; i < N; i++) v[i] = Math.random() * 0x100000000;
		}
		return v;
	}

	/**
	* Performs a bitwise XOR across TWO hypervectors.
	*
	* In HDC, XOR corresponds to binding, which combines
	* two hypervectors into a new one. Binding is invertible
	* (xor(a, xor(a, b)) = b).
	* 
	* @param {Hypervector} v1 Hypervector 1
	* @param {Hypervector} v2 Hypervector 2
	* @param {Hypervector} [r=null] Pre-allocated result vector.
	* @return {Hypervector} Result hypervector.
	*/
	xor(v1, v2, r=null) {
		if ( this.isChecks ) {
			if ( !this.isHypervector(v1) ) {
				throw new Error('First parameter is not a valid hypervector.');
			}
			if ( !this.isHypervector(v2) ) {
				throw new Error('Second parameter is not a valid hypervector.');
			}
			if ( r && !this.isHypervector(r) ) {
				throw new Error('Result	is not a valid hypervector.');
			}
		}
		
		// Result
		const N = this.arraySize;
		const w = r || new Uint32Array(v1);

		for (let j = 0; j < N; j+=4) {

			// Chunked for efficiency
			w[j] ^= v2[j];
			w[j + 1] ^= v2[j + 1];
			w[j + 2] ^= v2[j + 2];
			w[j + 3] ^= v2[j + 3];

		}

		return w;
	}


	/**
	* Performs a bitwise XOR across MULTIPLE hypervectors.
	* 
	* @param {Hypervector[]} vs Array of hypervectors.
	* @param {Hypervector} [r=null] Pre-allocated result vector.
	* @return {Hypervector} Result hypervector.
	*/
	xor2(vs, r=null) {
		if ( this.isChecks ) {
			if ( !Array.isArray(vs) ) {
				throw new Error('Parameter is not an array.');
			}
			if ( !vs.length ) {
				throw new Error('Parameter is an empty array.');
			}
			if ( vs.some( x => !this.isHypervector(x) ) ) {
				throw new Error('Parameter includes an element that is not a valid hypervector.');
			}
			if ( r && !this.isHypervector(r) ) {
				throw new Error('Result	is not a valid hypervector.');
			}
		}

		// Result
		const n = vs.length;
		const N = this.arraySize;
		let w;
		if ( r ) {
			r.set(vs[0]);
			w = r;
		} else {
			w = new Uint32Array(vs[0]);
		}
		
		for (let i = 1; i < n; i++) {
			const v = vs[i];
			for (let j = 0; j < N; j+=4) {

				// Chunked for efficiency
				w[j] ^= v[j];
  			w[j + 1] ^= v[j + 1];
  			w[j + 2] ^= v[j + 2];
  			w[j + 3] ^= v[j + 3];

			}
  	}

		return w;
	}

	/**
	* Computes the bitwise majority across multiple hypervectors.
	*
	* In HDC, MAJ represents bundling (or superposition) that
	* combines multiple hypervectors into a single prototype.
	* Each bit is set to the most common value among inputs.
	* 
	* @param {Hypervector[]} vs Array of hypervectors
	* @param {Hypervector} [r=null] Pre-allocated result vector
	* @return {Hypervector} Result hypervector.
	*/
	maj(vs, r=null) {
		if ( this.isChecks ) {
			if ( !Array.isArray(vs) ) {
				throw new Error('Parameter is not an array');
			}

			if ( !vs.length ) {
				throw new Error('Parameter is an empty array.');
			}

			if ( vs.some( x => !this.isHypervector(x) ) ) {
				throw new Error('Parameter includes an element that is  not a valid hypervector.');
			}

			if ( r && !this.isHypervector(r) ) {
				throw new Error('Result	is not a valid hypervector.');
			}
		}

		const n = vs.length;
		const N = this.arraySize;
		const w = r || new Uint32Array(N);

		// Solve ties with a random hypervector, is even number of elements
		const isEven = (n % 2 === 0);
		let tieBreaker;
		if ( isEven ) {
			tieBreaker = this.random();
		}

		// Threshold planes
		const threshold = n >> 1; // Integer division by 2
		const numPlanes = Math.ceil(Math.log2(n + 1)); // Number of planes
		const ts = new Uint32Array(numPlanes);
    for (let k = 0; k < numPlanes; k++) {
      if (threshold & (1 << k)) ts[k] = 0xFFFFFFFF;
    }

		// Calculate majority for each word
		for (let j = 0; j < N; j++) {

			// Bit-parallel addition
			let ps = new Uint32Array(numPlanes);
			for (let i = 0; i < n; i++) {
				let c = vs[i][j];
				let cPrev = c;
				for( let k=0; k < numPlanes; k++ ) {
					c = ps[k] & cPrev;
					ps[k] ^= cPrev;
					if (c === 0) break;
					cPrev = c;
				} 
			}

			// Bit-parallel comparison
			let gt = 0; // Mask of bits where sum > threshold
			let eq = 0xFFFFFFFF; // Mask of bits still equal so far

			for (let k = numPlanes - 1; k >= 0; k--) {
				const p = ps[k];
				const t = ts[k];
				gt |= (p & eq) & ~t; // Bits greater than threshold at this plane
				eq &= ~(p ^ t); // Bits equal at this plane
				if (eq === 0) break;
			}

			// Finalize per-bit majority result
			w[j] = gt >>> 0;
			if ( isEven && eq ) {
				 w[j] |= eq & tieBreaker[j];
			}

		}

		return w;
	}


	/**
	* Performs a cyclic rotation (permutation) of the bits in a hypervector.
	*
	* In HDC, ROT corresponds to the permutation operation, often used
	* to encode order or positional information in sequences.
	* 
	* @param {Hypervector} v
	* @param {number} [shift=1] Number of rotations to LEFT, negative to RIGHT
	* @param {Hypervector} [r=null] Pre-allocated result vector
	* @return {Hypervector} Rotated hypervector.
	*/
	rot( v, shift=1, r=null ) {
		if ( this.isChecks ) {
			if ( !this.isHypervector(v) ) {
				throw new Error('Not a valid hypervector.');
			}

			if ( !Number.isInteger(shift) ) {
				throw new Error('Rotation must an integer value');
			}

			if ( r && !this.isHypervector(r) ) {
				throw new Error('Result	is not a valid hypervector.');
			}
		}
  	
		// Result
		const w = r || new Uint32Array(this.arraySize);
	
		// Normalize shift to the vector's total bit length
  	shift = ((shift % this.dimension) + this.dimension) % this.dimension; // make 0..totalBits-1

		// No rotation
		if (shift === 0) {
			w.set(v);
			return w;
		}

		// Calculate how many full words and leftover bits to rotate
		const N = this.arraySize;
		const wordN = (shift >>> 5) % N;
		const bitN = shift & 31;
		const invN = 32 - bitN;

		let src1 = wordN;
		let src2 = (src1 + 1) % N;

		// If bitN = 0, we only rotate by whole words (faster path)
		if (bitN === 0) {
			for (let i = 0; i < N; i += 4) {
				w[i] = v[src1];
				if (++src1 === N) src1 = 0;
				w[i + 1] = v[src1];
				if (++src1 === N) src1 = 0;
				w[i + 2] = v[src1];
				if (++src1 === N) src1 = 0;
				w[i + 3] = v[src1];
				if (++src1 === N) src1 = 0;
			}
			return w;
		}

		// General case: combine bits across word boundaries
		for (let i = 0; i < N; i += 4) {
			w[i] = (v[src1] << bitN) | (v[src2] >>> invN);
			if (++src1 === N) src1 = 0;
			if (++src2 === N) src2 = 0;

			w[i + 1] = (v[src1] << bitN) | (v[src2] >>> invN);
			if (++src1 === N) src1 = 0;
			if (++src2 === N) src2 = 0;

			w[i + 2] = (v[src1] << bitN) | (v[src2] >>> invN);
			if (++src1 === N) src1 = 0;
			if (++src2 === N) src2 = 0;

			w[i + 3] = (v[src1] << bitN) | (v[src2] >>> invN);
			if (++src1 === N) src1 = 0;
			if (++src2 === N) src2 = 0;
		}

		return w;

	}

	/**
	* Computes the Hamming distance between TWO binary hypervectors.
	*
	* In HDC, D serves as the similarity metric (distance) used
	* for classification and retrieval. A smaller distance implies
	* higher similarity.
	* 
	* @param {Hypervector} v1 Hypervector 1
	* @param {Hypervector} v2 Hypervector 2
	* @return {number} Distance.
	*/
	d( v1, v2 ) {
		if ( this.isChecks ) {
			if ( !this.isHypervector(v1) ) {
				throw new Error('First parameter is not a valid hypervector.');
			}
			if ( !this.isHypervector(v2) ) {
				throw new Error('Second parameter is not a valid hypervector.');
			}
		}

		const N = this.arraySize;
		const p = this.bitcountLookup;
		let hdist = 0;
		for( let i=0; i<N; i++) {
			const x = (v1[i] ^ v2[i]);
			hdist += p[x & 0xFF] + p[(x >>> 8) & 0xFF] + p[(x >>> 16) & 0xFF] + p[(x >>> 24)];
		}

		return hdist;
	}

	/**
	* Computes the Hamming distance between MULTIPLE binary hypervectors.
	* 
	* @param {Hypervector} v Hypervector
	* @param {Hypervector[]} vs Array of hypervectors
	* @param {number[]} [rs=null] Pre-allocated result array
	* @return {number[]} Distances.
	*/
	d2( v, vs, rs=null ) {
		if ( this.isChecks ) {
			if ( !this.isHypervector(v) ) {
				throw new Error('First paramter is not a valid hypervector.');
			}

			if ( !Array.isArray(vs) ) {
				throw new Error('Second parameter is not an array.');
			}
			
			if ( !vs.length ) {
				throw new Error('Second parameter is an empty array.');
			}

			if ( vs.some( x => !this.isHypervector(x) ) ) {
				throw new Error('Second parameter includes an element that is not a valid hypervector.');
			}

			if ( rs ) {
				if ( !Array.isArray(rs) ) {
					throw new Error('Result is not an array.');
				}
				if ( rs.length !== vs.length ) {
					throw new Error('Result array is not the right size.');
				}
			}
		}
		
		const n = vs.length;
		const N = this.arraySize;
		const p = this.bitcountLookup;
		const r = rs || new Array(n);

		for (let j=0; j<n; j++ ) {
			const w = vs[j];
			let hdist = 0;
			for( let i=0; i<N; i++) {
				const x = (v[i] ^ w[i]);
				hdist += p[x & 0xFF] + p[(x >>> 8) & 0xFF] + p[(x >>> 16) & 0xFF] + p[(x >>> 24)];
			}
			r[j] = hdist;
		}

		return r;
	}

	/**
	* Get bit value.
	* 
	* @param {Hypervector} v Hypervector
	* @param {number} index Index
	* @return {boolean} If true, bit is set
	*/
	getBit(v, index) {
		if ( this.isChecks ) {
			if ( !this.isHypervector(v) ) {
				throw new Error('Not a valid hypervector.');
			}
		}

		const elementIndex = Math.floor(index / 32);
		const bitIndex = 31 - (index % 32);

		if (elementIndex >= v.length) {
			throw new RangeError("Index out of range");
		}

		return (v[elementIndex] & (1 << bitIndex)) !== 0;
	}

	/**
	* Set bit value.
	* 
	* @param {Hypervector} v Hypervector
	* @param {number} index Index
	* @param {boolean} value Value 
	*/
	setBit(v, index, value) {
		if ( this.isChecks ) {
			if ( !this.isHypervector(v) ) {
				throw new Error('Not a valid hypervector.');
			}
		}

		const elementIndex = Math.floor(index / 32);
		const bitIndex = 31 - (index % 32);

		if (elementIndex >= v.length) {
			throw new RangeError("Index out of range");
		}

		const mask = 1 << bitIndex;
		if (value) {
			v[elementIndex] |= mask; // set bit to 1
		} else {
			v[elementIndex] &= ~mask; // clear bit to 0
		}
	}

	/**
	* Encode hypervector as Base64 string.
	* 
	* @param {Hypervector} v Hypervector
	* @return {string} Base64 encoded string.
	*/
	b64Encode( v ) {
		if ( this.isChecks ) {
			if ( !this.isHypervector(v) ) {
				throw new Error('Not a valid hypervector.');
			}
		}

		let bytes = new Uint8Array(v.buffer);

		let s;
		if ( this.isBuffer ) {
			s = Buffer.from(bytes).toString('base64');
		} else {
			const chars = this.b64Chars;
			s = '';
			let i;

			for (i = 0; i + 2 < bytes.length; i += 3) {
					const triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
					s += chars[(triplet >> 18) & 0x3F];
					s += chars[(triplet >> 12) & 0x3F];
					s += chars[(triplet >> 6) & 0x3F];
					s += chars[triplet & 0x3F];
			}

			// Handle padding
			const remaining = bytes.length - i;
			if (remaining === 1) {
					const triplet = bytes[i] << 16;
					s += chars[(triplet >> 18) & 0x3F];
					s += chars[(triplet >> 12) & 0x3F];
					s += '==';
			} else if (remaining === 2) {
					const triplet = (bytes[i] << 16) | (bytes[i + 1] << 8);
					s += chars[(triplet >> 18) & 0x3F];
					s += chars[(triplet >> 12) & 0x3F];
					s += chars[(triplet >> 6) & 0x3F];
					s += '=';
			}
		}

    return s;
	}

	/**
	* Decode Base64 string as hypervector.
	* 
	* @param {string} s Base64 encoded string
	* @return {Hypervector} Hypervector.
	*/
	b64Decode( s ) {
		if ( this.isChecks ) {
			if ( typeof s !== "string" ) {
				throw new Error('Parameter is not a string.');
			}
		}

		let bytes;
		if ( this.isBuffer ) {
			bytes = Buffer.from( s, "base64" );
    } else {
			const lookup = this.b64Lookup;
			const clean = s.replace(/=+$/, '');
			const len = clean.length;
			bytes = new Uint8Array((len * 3 / 4) | 0);
			let byteIndex = 0;

			for (let i = 0; i < len; i += 4) {
				const sextet1 = lookup[clean.charCodeAt(i)];
				const sextet2 = lookup[clean.charCodeAt(i + 1)];
				const sextet3 = lookup[clean.charCodeAt(i + 2)] || 0;
				const sextet4 = lookup[clean.charCodeAt(i + 3)] || 0;

				const triple = (sextet1 << 18) | (sextet2 << 12) | (sextet3 << 6) | sextet4;

				if (byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 16) & 0xFF;
				if (byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 8) & 0xFF;
				if (byteIndex < bytes.length) bytes[byteIndex++] = triple & 0xFF;
			}
		}

		// Hypervector
		let v = new Uint32Array(
			bytes.buffer,
			bytes.byteOffset,
			bytes.byteLength / Uint32Array.BYTES_PER_ELEMENT
		);
		if ( !this.isHypervector(v) ) {
			throw new Error('Not a valid hypervector.');
		}

    return v;
	}

	/**
	* Encode hypervector as binary string.
	* 
	* @param {Hypervector} v Hypervector
	* @return {string} Binary string
	*/
	bitEncode( v ) {
		if ( this.isChecks ) {
			if ( !this.isHypervector(v) ) {
				throw new Error('Not a valid hypervector.');
			}
		}

		const N = this.arraySize;
		const r = Array( 4 * N );
		const p = this.binarystringLookup;
		let j = 0;
		for (let i = 0; i < N; i++) {
			const x = v[i];
    	r[j++] = p[(x >>> 24) & 0xFF];
    	r[j++] = p[(x >>> 16) & 0xFF];
    	r[j++] = p[(x >>> 8)  & 0xFF];
    	r[j++] = p[x & 0xFF];
		}

		return r.join('');
	}

	/**
	* Decode binary string as hypervector.
	* 
	* @param {string} s Binary string
	* @return {Hypervector} Hypervector.
	*/
	bitDecode( s ) {
		if ( this.isChecks ) {
			if ( typeof s !== "string" ) {
				throw new Error('Not a string.');
			}
			if ( s.length !== (this.arraySize * 32) ) {
				throw new Error('Invalid length.');
			}
		}

		const N = this.arraySize;
		const v = new Uint32Array(N);
		for (let i = 0; i < N; i++) {
    	const chunk = s.slice(i * 32, i * 32 + 32);
    	v[i] = parseInt(chunk, 2) >>> 0; // convert to unsigned 32-bit
  	}

		return v;
	}

}

export { HDC };
