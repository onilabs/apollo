/*
 * Oni Apollo 'sys' module
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

// NOTE: this file contains no actual implementation - it is a builtin,
// defined in src/sys/apollo-sys-common. This file exists solely for
// the purpose of documentation.

/**
  @module    sys
  @summary   SJS runtime utilities
  @home      sjs:sys

  @variable hostenv
  @summary Host environment that we're running in (currently one of 'nodejs' or 'xbrowser')

  @function getGlobal
  @summary Returns the global object (i.e. window or global, depending on [::hostenv])

  @function eval
  @param {String} [code]
  @param {optional Settings} [settings]
  @setting {optional String} [filename]
  @return {Object}
  @summary Dynamically evaluate SJS code
  @desc
    Returns the last expression from `code`.
*/

throw new Error("sys.sjs is a builtin, but attempted to load from disk");