/*
 * Copyright 2010 DotSpots, inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
package com.dotspots.cash;

import java.io.IOException;
import java.io.InputStreamReader;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextAction;
import org.mozilla.javascript.tools.shell.Main;

public class Cash {
	public static void main(String[] args) throws IOException {
		Main.shellContextFactory.call(new ContextAction() {
			@Override
			public Object run(Context cx) {
				try {
					Main.global.init(cx);
					cx.evaluateReader(Main.global, new InputStreamReader(getClass().getResourceAsStream("db.js")), "db.js", 0, null);
				} catch (IOException e) {
					e.printStackTrace();
				}
				return null;
			}
		});
		Main.exec(new String[0]);
	}
}
