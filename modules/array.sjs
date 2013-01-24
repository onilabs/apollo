/*
 * Oni Apollo 'array' module
 * Functions for working with arrays
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2013 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
/**
   @module  array
   @summary Functions for working with arrays
   @home    sjs:array
*/

var { Stream } = require('./sequence');

/**
   @function remove
   @altsyntax arr .. remove(elem)
   @param {Array} [arr] 
   @param {Object} [elem] Element to remove
   @return {Boolean} `true` if the element was removed, `false` if `elem` is not in `arr`.
   @summary Removes the first element in the array equal (under `===`) to `elem`. 
*/
function remove(arr, elem) {
  var idx = arr.indexOf(elem);
  if (idx == -1) return false;
  arr.splice(idx, 1);
  return true;
}
exports.remove = remove;

/**
   @function indexValuePairs
   @param {Array} [arr]
   @return {sequence::Stream}
   @summary  Returns a [sequence::Stream] of index-value pairs `[0,arr[0]], [1,arr[1]], ...`
*/
function indexValuePairs(arr) {  
  return Stream(function(r) { for (var i=0; i<arr.length; ++i) r([i,arr[i]]) });
}
exports.indexValuePairs = indexValuePairs;