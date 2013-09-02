/**
 * #require(unify.ui.core.EventHandler)
 */
/*
===============================================================================================

		Unify Project

		Homepage: unify-project.org
		License: MIT + Apache (V2)
		Copyright: 2010-2012, Sebastian Fastner, Mainz, Germany, http://unify-training.com

===============================================================================================
*/

/**
 * EXPERIMENTAL
 *
 * Generic widget that depends on a slighly modified qooxdoo LayoutItem
 * This is the base of every widget in the unify widget system
 *
 * Heavily influenced by qooxdoo widget class
 */
/*
#use(unify.ui.core.EventHandler)
*/
core.Class("unify.ui.core.Widget", {
	include : [unify.ui.core.VisibleBox],

	/**
	 * @param layout {unify.ui.layout.Base} Layout of widget
	 */
	construct : function() {
		unify.ui.core.VisibleBox.call(this);

		this.__renderLayoutDone = false;

		this.__initializeRenderQueue();
		this.__initializeSizing();
		this.__element = this.__createElement();
	},

	events : {
		/**
		 * Fired on resize of the widget.
		 */
		resize : core.event.Simple,
		
		/**
		 * Fired on resize of the widget.
		 */
		appearance : core.event.Simple,
		
		/**
		 * Fired on change of appearance property
		 */
		changeAppearance : core.event.Simple,
		
		/**
		 * Fired on change of visibility property
		 */
		changeVisibility : core.event.Simple,


		/**
		 * Fired on move of the widget.
		 */
		move : core.event.Simple,

		/** Fired if widget is focusable {@link #focusable} and gets focus */
		focus : core.event.Simple,

		/** Fired if widget is focusable {@link #focusable} and looses focus */
		blur : core.event.Simple
	},

	properties : {
		/**
		 * {String} Controls the visibility. Valid values are:
		 *
		 * * visible: Render the widget
		 * * hidden: Hide the widget but don't relayout the widget's parent.
		 * * excluded: Hide the widget and relayout the parent as if the widget was not a child of its parent.</li>
		 */
		visibility : {
			type : ["visible", "hidden", "excluded"],
			init : "visible",
			apply : function(value, old) { if (value !== old) {
				this._applyVisibility(value, old); 
			}},
			fire : "changeVisibility"
		},

		/**
		 * {String?null} Appearance ID of widget used by theme system
		 */
		appearance : {
			init : null,
			apply : function(value, old) { if (value !== old) {
				this._applyAppearance(value, old); 
			}},
			fire : "changeAppearance"
		},

		/**
		 * Parent's inset to apply to child
		 */
		parentInset : {
			init : null
		},

		/**
		 * Whether the widget is enabled. Disabled widgets are usually grayed out
		 * and do not process user created events. While in the disabled state most
		 * user input events are blocked. Only the {@link #mouseover} and
		 * {@link #mouseout} events will be dispatched.
		 */
		enabled : {
			type : "Boolean",
			apply : function(value, old) { this._applyEnabled(value, old); },
			fire : "changeEnabled",
			init : true
		},

		/**
		 * Defines the tab index of an widget. If widgets with tab indexes are part
		 * of the current focus root these elements are sorted in first priority. Afterwards
		 * the sorting continues by rendered position, zIndex and other criteria.
		 *
		 * Please note: The value must be between 1 and 32000.
		 */
		tabIndex : {
			type : "Integer",
			nullable : true,
			apply : function(value, old) { this._applyTabIndex(value, old); }
		},

		/**
		 * Whether the widget is focusable e.g. rendering a focus border and visualize
		 * as active element.
		 *
		 * See also {@link #isTabable} which allows runtime checks for
		 * <code>isChecked</code> or other stuff to test whether the widget is
		 * reachable via the TAB key.
		 */
		focusable : {
			type : "Boolean",
			init : false,
			apply : function(value, old) { this._applyFocusable(value, old); }
		},

		/**
		 * ID to attach to event to support automatic ui tests
		 */
		testId : {
			type : "String",
			nullable : true,
			init : null,
			apply : function(value, old) { this._applyTestId(value, old); }
		}
	},

	members: {
		__accelerated : false,
		__transformFnt : unify.bom.Transform.translate,
		/**
		 * Force accelerated widget. This is GPU intensive and should only be enabled
		 * if neccessary.
		 */
		forceAccelerated : function() {
			this.__accelerated = true;
			this.__transformFnt = unify.bom.Transform.accelTranslate;
		},
		
		__nativeListenerRegistry : null,
		
		/**
		 * Adds native listener with @type {String} on element of widget.
		 * TODO: Signature
		 */
		addNativeListener:  function(type) {
			var args = arguments;
			if (typeof(type) == "string") {
				args = [this.getEventElement()];
				for (var i=0,ii=arguments.length; i<ii; i++) {
					args.push(arguments[i]);
				}
			}
			return unify.ui.core.VisibleBox.prototype.addNativeListener.apply(this, args);
		},
		
		/**
		 * Removes native listener with @type {String} on element of widget.
		 * TODO: Signature
		 */
		removeNativeListener:  function(type) {
			var args = arguments;
			if (typeof(type) == "string") {
				args = [this.getEventElement()];
				for (var i=0,ii=arguments.length; i<ii; i++) {
					args.push(arguments[i]);
				}
			}
			return unify.ui.core.VisibleBox.prototype.removeNativeListener.apply(this, args);
		},

		/** {Map} Padding of element */
		__padding : null,

		/** {Map} Border size of element */
		__border : null,

		/** {Map} Virtual position. Only set if widget is virtual container without DOM representation */
		__virtualPosition : null,

		/** {Boolean} Widget has valid rendered layout */
		__renderLayoutDone : null,

		/**
		 * Initializes padding and border size to zero
		 */
		__initializeSizing : function() {
			this.__padding = {
				left: 0,
				top: 0,
				right: 0,
				bottom: 0
			};
			this.__border = {
				left: 0,
				top: 0,
				right: 0,
				bottom: 0
			};
			this.__virtualPosition = {
				left: 0,
				top: 0
			};
		},

		/**
		 * Initializes render queue
		 */
		__initializeRenderQueue : function() {
			this.__renderQueue = {
				append: [],
				indexed: {}
			};
		},

		// property apply
		_applyVisibility : function(value, old)
		{
			var container = this.getElement();


			if (value === "visible") {
				this.__setElementStyle(container, "display", "block");
			} else {
				this.__setElementStyle(container, "display", "none");
			}

			// only force a layout update if visibility change from/to "exclude"
			var parent = this.getParentBox();
			
			if (parent && (old == null || value == null || old === "excluded" || value === "excluded")) {
				while (parent) {
					// TODO: Check if all this is neccessary!
					parent.invalidateLayoutCache();
					parent.invalidateLayoutChildren();
					parent = parent.getParentBox();
				}
			}

			// Update visibility cache
			unify.ui.layout.queue.Visibility.add(this);
		},

		/**
		 * Apply navigation on element
		 *
		 * @deprecated
		 * @param value {Map[]} Navigation object
		 */
		_applyNavigation : function(value) {
			if (value && this._hasElement()) {
				this.__applyNavigation(this.getElement(), value);
			}
		},

		/**
		 * Apply navigation on element
		 *
		 * @deprecated
		 * @param element {Element} DOM element to apply navigation upon
		 * @param map {Map[]} Navigation object
		 */
		__applyNavigation : function(element, map) {
			for (var key in map) {
				var value = map[key];
				element.setAttribute(key, value);
			}
		},

		// overridden
		_applyAppearance : function(value) {
			if (jasy.Env.getValue("debug")) {
				var e = this.getElement();
				if (!e) {
					console.error("NO ELEMENT : ", this.constructor);
				}
				if (e.setAttribute) {
					e.setAttribute("appearance",value);
				}
			}
			this.updateAppearance();
		},

		// property apply
		_applyEnabled : function(value, old)
		{
			if (value===false)
			{
				this.addState("disable");
				this.removeState("hover");

				// Blur when focused
				if (this.getFocusable()) {
					// Remove focused state
					this.removeState("active");

					// Remove tabIndex
					this._applyFocusable(false, true);
				}
/*
				// Remove draggable
				if (this.isDraggable()) {
					this._applyDraggable(false, true);
				}

				// Remove droppable
				if (this.isDroppable()) {
					this._applyDroppable(false, true);
				}*/
			}
			else
			{
				this.removeState("disable");

				// Re-add tabIndex
				if (this.getFocusable()) {
					this._applyFocusable(true, false);
				}
/*
				// Re-add draggable
				if (this.isDraggable()) {
					this._applyDraggable(true, false);
				}

				// Re-add droppable
				if (this.isDroppable()) {
					this._applyDroppable(true, false);
				}*/
			}
		},

		_applyTabIndex : function(value)
		{
			if (value == null) {
				value = 1;
			} else if (value < 1 || value > 32000) {
				throw new Error("TabIndex property must be between 1 and 32000");
			}

			this.getElement().setAttribute("tabIndex", value);
		},

		_applyFocusable : function(value, old)
		{
			if (value) {
				var tabIndex = this.getTabIndex();
				if (tabIndex == null) {
					tabIndex = 1;
				}

				this.getElement().setAttribute("tabIndex", tabIndex);
			} else if (old) {
				this.getElement().setAttribute("tabIndex", null);
			}
		},

		/**
		 * Adds focus to element
		 */
		tabFocus : function() {
			this.addState("active");
            this.fireEvent("focus");
		},

		/**
		 * Removes focus from element
		 */
		tabBlur : function() {
			this.removeState("active");
            this.fireEvent("blur");
		},
		
		_startFocusHandler: function() {
			unify.ui.core.FocusHandler.getInstance().startFocusHandler();
		},
		
		_stopFocusHandler : function() {
			unify.ui.core.FocusHandler.getInstance().stopFocusHandler();
		},

		__layoutManager : null,

		/**
		 * {unify.ui.layout.Base} Returns layout manager attached to widget
		 */
		_getLayout : function() {
			return this.__layoutManager;
		},

		/**
		 * Set a layout manager @layout {unify.ui.layout.Base} for the widget. 
		 * A layout manager can only be connected with one widget. Reset the 
		 * connection with a previous widget first, if you like to use it in 
		 * another widget instead.
		 */
		_setLayout : function(layout) {
			if (jasy.Env.getValue("debug")) {
				if (layout) {
					// TODO : this.assertInstance(layout, unify.ui.layout.Base);
				}
			}

			if (this.__layoutManager) {
				this.__layoutManager.connectWidget(null);
			}

			if (layout) {
				layout.connectWidget(this);
			}

			this.__layoutManager = layout;
			unify.ui.layout.queue.Layout.add(this);
		},

		/**
		 * Returns the recommended / natural dimension of the widget's content
		 *
		 * @return {Map} Size hint
		 */
		_getContentHint : function() {
			var layout = this.__layoutManager;
			if (layout) {
				if (this.hasLayoutChildren()) {
					var hint = layout.getSizeHint();

					if (!hint) {
						this.error("Layout " + layout.constructor + " has no size hint!");
						return {
							width: 0,
							height: 0
						};
					}
					/*if (jasy.Env.getValue("debug")) {
						var msg = "The layout " + layout.toString() + " of the widget " + this.toString() + " returned an invalid size hint!";
						this.assetInteger(hint.width, "Wrong width value. " + msg);
						this.assetInteger(hint.height, "Wrong height value. " + msg);
					}*/

					return hint;
				} else {
					return {
						width: 0,
						height: 0
					};
				}
			} else {
				return {
					width: 100,
					height: 50
				};
			}
		},

		// overridden
		_computeSizeHint : function() {
			
			// Start with the user defined values
			var width = this.getWidth();
			var minWidth = this.getMinWidth();
			var maxWidth = this.getMaxWidth();

			var height = this.getHeight();
			var minHeight = this.getMinHeight();
			var maxHeight = this.getMaxHeight();

			if (jasy.Env.getValue("debug"))
			{
				if (minWidth !== null && maxWidth !== null) {
					// TODO: this.assert(minWidth <= maxWidth, "minWidth is larger than maxWidth!");
				}
				if (minHeight !== null && maxHeight !== null) {
					// TODO: this.assert(minHeight <= maxHeight, "minHeight is larger than maxHeight!");
				}
			}

			var border = this.__border;
			var padding = this.__padding;
			var insetX = border.left + border.right + padding.left + padding.right;
			var insetY = border.top + border.bottom + padding.top + padding.bottom;

			var contentHint = {};
			
			if (width == null || height == null) {
				// Ask content
				contentHint = this._getContentHint();

				if (width == null) {
					width = contentHint.width + insetX;
				}
				if (height == null) {
					height = contentHint.height + insetY;
				}
			}

			if (minWidth == null)
			{
				minWidth = insetX;

				if (contentHint.minWidth != null) {
					minWidth += contentHint.minWidth;
				}
			}

			if (minHeight == null)
			{
				minHeight = insetY;

				if (contentHint.minHeight != null) {
					minHeight += contentHint.minHeight;
				}
			}

			if (maxWidth == null)
			{
				if (contentHint.maxWidth == null) {
					maxWidth = Infinity;
				} else {
					maxWidth = contentHint.maxWidth + insetX;
				}
			}

			if (maxHeight == null)
			{
				if (contentHint.maxHeight == null) {
					maxHeight = Infinity;
				} else {
					maxHeight = contentHint.maxHeight + insetY;
				}
			}


			// Build size hint and return
			return {
				width : width,
				minWidth : minWidth,
				maxWidth : maxWidth,
				height : height,
				minHeight : minHeight,
				maxHeight : maxHeight
			};
		},

		/*
		---------------------------------------------------------------------------
			APPEARANCE SUPPORT
		---------------------------------------------------------------------------
		*/

		/** {String} The currently compiled selector to lookup the matching appearance */
		__appearanceSelector : null,


		/** {Boolean} Whether the selectors needs to be recomputed before updating appearance */
		__updateSelector : null,


		/**
		 * Renders the appearance using the current widget states.
		 */
		syncAppearance : function()
		{
			var manager = unify.theme.Manager.get();
			var states = this.__states;
			var selector = this.__appearanceSelector;
			var oldStyle, newStyle, key;

			if (manager) {
				// Check for requested selector update
				if (this.__updateSelector) {
					// Clear flag
					this.__updateSelector = false;

					// Check if the selector was created previously
					if (selector) {
						// Query old style
						oldStyle = manager.resolveStyle(selector, states);
						//oldStyle = manager.styleFrom(selector, states, null, this.getAppearance());

						// Clear current selector (to force recompute)
						selector = null;
					}
				}
				// Build selector
				if (!selector) {
					selector = this.__appearanceSelector = this.getAppearance();
					if (!selector) {
						this.warn("No appearance set on " + this.constructor);
						return;
					}
				}

				// Query current selector
				//newStyle = manager.styleFrom(selector, states, null, this.getAppearance());
				newStyle = manager.resolveStyle(selector, states);

				if (newStyle) {
					if (oldStyle) {
						var oldStyleData = {};
						var hasOldStyleData = false;
						for (key in oldStyle) {
							if (newStyle[key] === undefined) {
								hasOldStyleData = true;
								oldStyleData[key] = null;
							}
						}
						if (hasOldStyleData) {
							this._setStyle(oldStyleData);
						}
					}
					this._setStyle(newStyle);

				} else if (oldStyle) {
					var styleData = {};
					for (key in oldStyle) {
						styleData[key] = undefined;
					}
					this._setStyle(styleData);
				}
			}

			this.invalidateLayoutCache();

			if (!this.__initialAppearanceApplied) {
				this.__setElementStyle(this.getElement(), "visibility", "visible");
				this.__initialAppearanceApplied = true;
			}
				
			this.fireEvent("appearance", this.__states);
		},

		/**
		 * Updates appearance of widget
		 */
		updateAppearance : function() {
			// Clear selector
			this.__updateSelector = true;

			// Add to appearance queue
			unify.ui.layout.queue.Appearance.add(this);
		},

		/** {Boolean} Flag if initial appearance is applied */
		__initialAppearanceApplied : false,

		/**
		 * Checks if appearance need to be applied to widget
		 */
		checkAppearanceNeeds : function() {
			// CASE 1: Widget has never got an appearance already because it was never
			// visible before. Normally add it to the queue is the easiest way to update it.
			if (!this.__initialAppearanceApplied)
			{
				unify.ui.layout.queue.Appearance.add(this);
			}

			// CASE 2: Widget has got an appearance before, but was hidden for some time
			// which results into maybe omitted state changes have not been applied.
			// In this case the widget is already queued in the appearance. This is basically
			// what all addState/removeState do, but the queue itself may not have been registered
			// to be flushed
			else if (this.$$stateChanges)
			{
				unify.ui.layout.queue.Appearance.add(this);
				delete this.$$stateChanges;
			}
		},







		__dimensionInfo : null,

		/**
		 * Returns information of position of widget
		 *
		 * @return {Map[]} Returns left and top position and width and height of widget
		 */
		getPositionInfo : function() {
			var e = this.getElement();

			var pos = unify.ui.core.Util.getWidgetLocation(this);
			var dim = this.__dimensionInfo || lowland.bom.Element.getContentSize(e);

			return {
				left: pos.left,
				top: pos.top,
				width: dim.width,
				height: dim.height,
				padding: this.__padding,
				border: this.__border
			};
		},
		
		getRenderedDimension : function() {
			return this.__dimensionInfo;
		},
		
		/**
		 * Returns padding information of widget
		 *
		 * @return {Map} Padding information
		 */
		getPadding : function() {
			return this.__padding;
		},
		
		/**
		 * Returns border information of widget
		 *
		 * @return {Map} Border information
		 */
		getBorder : function() {
			return this.__border;
		},

		/**
		 * Returns if widget is layouted
		 *
		 * @return {Boolean} Widget is layouted
		 */
		hasRenderedLayout : function() {
			return !!this.__renderLayoutDone;
		},
		
		__elementPos : null,
		__modificationPosition : null,
		
		/**
		 * {Map} Returns rendered position of element.
		 */
		getPosition : function() {
			return this.__elementPos;
		},
		
		setPostLayout : function(option) {
			this.__postlayoutTransform = option;
			var layoutTransform = this.__layoutTransform || "";
			this.__setElementStyle(this.getElement(), "transform", layoutTransform + " " + option);
		},
		
		__overrideLayout : false,
		overrideLayoutTransform : function(left, top) {
			if (jasy.Env.isSet("render.translate")) {
				this.__overrideLayout = { left: left, top: top };
				var layoutTransform = this.__layoutTransform = this.__transformFnt(left + "px", top + "px");
				this.__setElementStyle(this.getElement(), "transform", layoutTransform + " " + (this.__postlayoutTransform || ""));
			} else {
				this.__overrideLayout = { left: left, top: top };
				this.__setElementStyle(this.getElement(), {
					left: left + "px",
					top: top + "px"
				});
			}
		},

		/**
		 * Render method to apply layout on widget's DOM element. This method applies
		 * @left {Integer} and @top {Integer} position and @width {Integer} and 
		 * @height {Integer} of element. Optional if @preventSize {Boolean?false} is
		 * set to true the original DOM element size is not changed. This is only
		 * useful if element is an root DOM element.
		 */
		renderLayout : function(left, top, width, height, preventSize) {
			if (jasy.Env.isSet("debug")) {
				if (this.isDisposed()) {
					throw "Widget " + this + " is disposed; rendering not allowed; parent: " + this.getParentBox();
				}
			}
			var userOverride = this.getUserData("domElementPositionOverride");
			var userModification = this.getUserData("domElementPositionModification");

			if (userModification) {
				left += userModification.left;
				top += userModification.top;
			}

			var dimension = this.__dimensionInfo = {
				width: width,
				height: height
			};
			var changes = unify.ui.core.VisibleBox.prototype.renderLayout.call(this, left, top, width, height);

			if(!changes && !userOverride) {
				return;
			}

			var parentInset = this.getParentInset();
			if(parentInset) {
				left += parentInset[0];
				top += parentInset[1];
			}
			if (!preventSize) {
				var element = this.getElement();
				var isDocFragment;
				if (jasy.Env.getValue("engine") == "trident") {
					isDocFragment = element.nodeName == "#document-fragment";
				} else {
					isDocFragment = element instanceof DocumentFragment;
				}
				if (isDocFragment) {
					// Only virtual layouter, so save calculated values. There is no element to set position infos on.
					this.__virtualPosition = {left: left, top: top};
				} else {
					// Get position of parent if virtual layout to calculate new relative positions
					var layoutParent = this.getParentBox();
					var parentVirtualPosition = {left: 0, top: 0};
					if (layoutParent) {
						parentVirtualPosition = layoutParent.getVirtualPosition();
					} else {
						if (jasy.Env.getValue("debug")) {
							this.warn("No parent widget set, so virtual position is set to 0/0")
						}
					}
					
					if (userOverride) {
						left = userOverride.left;
						top = userOverride.top;
						parentVirtualPosition = {left: 0, top: 0};
					}
					
					var newLeft = (left + parentVirtualPosition.left);
					var newTop = (top + parentVirtualPosition.top);
					
					
					this.__elementPos = [newLeft, newTop];
					
					var scale = this.getBoxScale();
					var newWidth = width / scale;
					var newHeight = height / scale;
					
					var options = {
						position: "absolute",
						width: newWidth + "px",
						height: newHeight + "px",
						transform: ""
					};
					var overrideLayout = this.__overrideLayout;
					if (jasy.Env.isSet("render.translate")) {
						if (!overrideLayout) {
							options.left = 0;
							options.top = 0;
							
							if (newLeft+newTop !== 0) {
								options.transform = this.__transformFnt(newLeft+"px", newTop+"px");
							}
						} else {
							if (overrideLayout.left+overrideLayout.top !== 0) {
								options.transform = this.__transformFnt(overrideLayout.left+"px", overrideLayout.top+"px");
							}
						}
					} else {
						if (!overrideLayout) {
							options.left = newLeft + "px";
							options.top = newTop + "px";
						} else {
							options.left = overrideLayout.left + "px";
							options.top = overrideLayout.top + "px";
						}
					}
					if (scale !== 1) {
						// Scale with origin top left
						options.transform += " translate(-50%, -50%) scale(" + scale + ") translate(50%, 50%)";
					}
					this.__layoutTransform = options.transform;
					options.transform += " " + (this.__postlayoutTransform||"");
					
					if (options.transform.trim() == "") {
						options.transform = this.__transformFnt(0,0) + " ";
					}
					this.__setElementStyle(element, options);
				}
			}

			if (this._hasChildren()) {
				var padding = this.__padding;
				var border = this.__border;

				var innerWidth = width - (padding.left + padding.right) - (border.left + border.right);
				var innerHeight = height - (padding.top + padding.bottom) - (border.top + border.bottom);

				var children = this._getChildren();
				if (children) {
					for (var i=0,ii=children.length; i<ii; i++) {
						children[i].setParentInset([padding.left, padding.top]);
					}
				}

				if (this.__layoutManager && this.hasLayoutChildren()) {
					this.__layoutManager.renderLayout(innerWidth, innerHeight);
				} else if (this.hasLayoutChildren()) {
					throw new Error("No layout in " + this);
				}
			}

			// Add children from render queue to DOM
			var queue = this.__renderQueue;
			var indexed = queue.indexed;
			var append = queue.append;
			var contentElement = this.getContentElement();
			var childNodes = contentElement.childNodes;

			for (var key in indexed) {
				var e = indexed[key];
				if (e) {
					var childNode = childNodes[key];
					var insertCount=e.length;
					if(insertCount>0){
						var elementToInsert=e[0];
						if(insertCount>1){
							elementToInsert = document.createDocumentFragment();
							for (var i=0; i<insertCount; i++) {
								elementToInsert.appendChild(e[i]);
							}
						}
						if (childNode) {
							contentElement.insertBefore(elementToInsert,childNode);
						} else {
							contentElement.appendChild(elementToInsert);
						}
					}
				}
			}
			var appendCount=append.length;
			if(appendCount>0){
				var elementToAppend = append[0];
				if(appendCount>1){
					elementToAppend = document.createDocumentFragment();
					for (var j=0; j<appendCount; j++) {
						elementToAppend.appendChild(append[j]);
					}
				}
				contentElement.appendChild(elementToAppend);
			}

			this.__initializeRenderQueue();

			// Fire events
			if (changes.position && this.hasListener("move")) {
				this.fireEvent("move");
			}
			if (changes.size && this.hasListener("resize")) {
				this.fireEvent("resize", dimension);
			}

			this.__renderLayoutDone = true;
		},

		/**
		 * Returns inner size available for content elements
		 *
		 * @return {Map} Width and height of available inner content size
		 */
		getContentSize : function() {
			var size = this.getBounds();
			var padding = this.__padding;
			var border = this.__border;

			return {
				width: size.width - (padding.left + padding.right) - (border.left + border.right),
				height: size.height - (padding.top + padding.bottom) - (border.top + border.bottom)
			};
		},

		/**
		 * Returns virtual position calculated via layouter
		 *
		 * @return {Map} Virtual position of element
		 */
		getVirtualPosition : function() {
			return this.__virtualPosition;
		},

		/**
		 * Returns content element to add children to
		 *
		 * @return {Element} DOM element
		 */
		getContentElement : function() {
			return this.getElement();
		},

		/**
		 * Returns whether the layout has children, which are layout relevant. This
		 * excludes all widgets, which have a {@link unify.ui.core.Widget#visibility}
		 * value of <code>exclude</code>.
		 *
		 * @return {Boolean} Whether the layout has layout relevant children
		 */
		hasLayoutChildren : function() {
			var children = this.__widgetChildren;
			if (!children) {
				return false;
			}

			var child;
			for (var i=0,ii=children.length; i<ii; i++) {
				child = children[i];
				if (!child.hasUserBounds() && !child.isExcluded()) {
					return true;
				}
			}
		},

		/**
		 * {Array} Placeholder for children list in empty widgets.
		 *     Mainly to keep instance number low.
		 *
		 * @lint ignoreReferenceField(__emptyChildren)
		 */
		__emptyChildren : [],

		/**
		 * Returns all children, which are layout relevant. This excludes all widgets,
		 * which have a {@link unify.ui.core.Widget#visibility} value of <code>exclude</code>.
		 *
		 * @internal
		 * @return {unify.ui.core.Widget[]} All layout relevant children.
		 */
		getLayoutChildren : function()
		{
			var children = this.__widgetChildren;
			if (!children) {
				return this.__emptyChildren;
			}

			var layoutChildren;
			for (var i=0, l=children.length; i<l; i++)
			{
				var child = children[i];
				if (child.hasUserBounds() || child.isExcluded())
				{
					if (layoutChildren == null) {
						layoutChildren = children.concat();
					}

					core.Array.remove(layoutChildren, child);
				}
			}

			return layoutChildren || children;
		},


		/**
		 * Marks the layout of this widget as invalid and triggers a layout update.
		 */
		scheduleLayoutUpdate : function() {
			unify.ui.layout.queue.Layout.add(this);
		},


		/**
		 * Resets the cache for children which should be laid out.
		 */
		invalidateLayoutChildren : function()
		{
			if (this.isDisposed()) {
				return;
			}
			var layout = this.__layoutManager;
			if (layout) {
				layout.invalidateChildrenCache();
			}

			unify.ui.layout.queue.Layout.add(this);
		},


		/*
		---------------------------------------------------------------------------
			VISIBILITY API
		---------------------------------------------------------------------------
		*/

		/**
		 * Shows the widgets.
		 */
		show : function() {
			this.setVisibility("visible");
		},


		/**
		 * Hides the widget.
		 */
		hide : function() {
			this.setVisibility("hidden");
		},


		/**
		 * Excludes the widget
		 */
		exclude : function() {
			this.setVisibility("excluded");
		},


		/**
		 * Returns if the widget is visible.
		 *
		 * @return {Boolean} Returns true if the widget is visible.
		 */
		isVisible : function() {
			return this.getVisibility() == "visible";
		},


		/**
		 * Returns if the widget is not visible (hidden or excluded).
		 *
		 * @return {Boolean} Returns true if the widget is not visible.
		 */
		isHidden : function() {
			return this.getVisibility() != "visible";
		},


		/**
		 * Returns if the widget is excluded from the rendering queue.
		 *
		 * @return {Boolean} Returns true if the widget is excluded.
		 */
		isExcluded : function() {
			return this.getVisibility() == "excluded";
		},









		/*
		---------------------------------------------------------------------------
			STATE HANDLING
		---------------------------------------------------------------------------
		*/

		/** {Map} The current widget states */
		__states : null,


		/** {Boolean} Whether the widget has state changes which are not yet queued */
		$$stateChanges : null,


		/** {Map} Can be overridden to forward states to the child controls. */
		_forwardStates : null,


		/**
		 * {Map} Returns all current states of widget.
		 */
		getAllStates : function() {
			return this.__states;
		},

		/**
		 * {Boolean} Returns whether @state {String} is set on widget.
		 */
		hasState : function(state)
		{
			var states = this.__states;
			return !!states && !!states[state];
		},


		/**
		 * Add the state @state {String} to widget.
		 */
		addState : function(state)
		{
			// Dynamically create state map
			var states = this.__states;
			if (!states) {
				states = this.__states = {};
			}

			if (states[state]) {
				return;
			}

			// Add state and queue
			this.__states[state] = true;

			// Fast path for hovered state
			if (!unify.ui.layout.queue.Visibility.isVisible(this)) {
				this.$$stateChanges = true;
			} else {
				unify.ui.layout.queue.Appearance.add(this);
			}
		},


		/**
		 * Removes @state {String} from widget.
		 */
		removeState : function(state)
		{
			// Check for existing state
			var states = this.__states;
			if (!states || !states[state]) {
				return;
			}

			// Clear state and queue
			delete this.__states[state];

			// Fast path for hovered state
			if (!unify.ui.layout.queue.Visibility.isVisible(this)) {
				this.$$stateChanges = true;
			} else {
				unify.ui.layout.queue.Appearance.add(this);
			}
		},


		/**
		 * Replaces the state @old {String} with @value {String} as new state.
		 */
		replaceState : function(old, value)
		{
			var states = this.__states;
			if (!states) {
				states = this.__states = {};
			}

			if (!states[value]) {
				states[value] = true;
			}

			if (states[old]) {
				delete states[old];
			}

			if (!unify.ui.layout.queue.Visibility.isVisible(this)) {
				this.$$stateChanges = true;
			} else {
				unify.ui.layout.queue.Visibility.add(this);
			}
		},




		/*
		---------------------------------------------------------------------------
			FOCUS SYSTEM USER ACCESS
		---------------------------------------------------------------------------
		*/

		/**
		 * Focus this widget.
		 *
		 * @return {void}
		 */
		focus : function()
		{
			if (this.hasState("disable")) {
				return;
			}
			
			this.getContentElement().focus();
		},


		/**
		 * Remove focus from this widget.
		 *
		 * @return {void}
		 */
		blur : function()
		{
			this.getContentElement().blur();
		},











		__style : null,
		__font : null,

		/**
		 * Set styles @map {Map} to the element
		 */
		setStyle : function(map) {
			this._setStyle(map);
		},

		__cloneMap : function(obj) {
			if(obj == null || typeof(obj) != 'object') {
				return obj;
			}
	
			var temp = obj.constructor(); // changed
	
			for(var key in obj) {
				temp[key] = this.__cloneMap(obj[key]);
			}
			
			return temp;
		},
		
		__mergeObjects : function(map1, map2) {
			var keys = Object.keys(map2);
			
			for (var i=0,ii=keys.length; i<ii; i++) {
				var key = keys[i];
				map1[key] = map2[key];
			}
			
			return map1;
		},
		
		__setElementStyle : function(element, name, property) {
			if (element && String(element).indexOf("DocumentFragment") < 0) {
				lowland.bom.Style.set(element, name, property);
			}
		},

		/**
		 * Set styles of @map {Map} to the element.
		 */
		_setStyle : function(map) {
			//validation

			map = this.__cloneMap(map);
			var keys = Object.keys(map);
			var disallowedStyles={
				//positioning and visibility is done by  engine
				left:true,
				top:true,
				bottom:true,
				right:true,
				position:true,
				visibility:true,
				display:true,
				//border is not resolved, use more specific properties
				border:true,
				borderSize:true
			};
			for (var i=0,ii=keys.length; i<ii; i++) {
				var key = keys[i];
				if(disallowedStyles[key]){
					this.error("Widget style type " + key + " is not allowed");
				}
			}

			//properties

			var properties = null;
			if (map.properties) {
				properties = map.properties;
				delete map.properties;
			}

			//dimensions

			if (map.height) {
				this.setHeight(parseInt(map.height,10));
				delete map.height;
			}
			if (map.width) {
				this.setWidth(parseInt(map.width,10));
				delete map.width;
			}

			//margins

			if (map.margin) {
				var margin = map.margin.split(" ");
				map.marginTop = margin[0];
				map.marginRight = margin[1] || margin[0];
				map.marginBottom = margin[2] || margin[0];
				map.marginLeft = margin[3] || margin[1] || margin[0];
				delete map.margin;
			}
			if (map.marginLeft) {
				this.setMarginLeft(parseInt(map.marginLeft, 10));
				delete map.marginLeft;
			}
			if (map.marginTop) {
				this.setMarginTop(parseInt(map.marginTop, 10));
				delete map.marginTop;
			}
			if (map.marginRight) {
				this.setMarginRight(parseInt(map.marginRight, 10));
				delete map.marginRight;
			}
			if (map.marginBottom) {
				this.setMarginBottom(parseInt(map.marginBottom, 10));
				delete map.marginBottom;
			}

			//paddings

			if (map.padding) {
				var padding = map.padding.split(" ");
				map.paddingTop = padding[0];
				map.paddingRight = padding[1] || padding[0];
				map.paddingBottom = padding[2] || padding[0];
				map.paddingLeft = padding[3] || padding[1] || padding[0];
				delete map.padding;
			}

			//borders

			if (map.borderWidth) {
				var borderWidth = map.borderWidth.split(" ");
				map.borderTopWidth = borderWidth[0];
				map.borderRightWidth = borderWidth[1] || borderWidth[0];
				map.borderBottomWidth = borderWidth[2] || borderWidth[0];
				map.borderLeftWidth = borderWidth[3] || borderWidth[1] || borderWidth[0];
				delete map.borderWidth;
			}
			if (map.borderStyle) {
				var borderStyle = map.borderStyle.split(" ");
				map.borderTopStyle = borderStyle[0];
				map.borderRightStyle = borderStyle[1] || borderStyle[0];
				map.borderBottomStyle = borderStyle[2] || borderStyle[0];
				map.borderLeftStyle = borderStyle[3] || borderStyle[1] || borderStyle[0];
				delete map.borderStyle;
			}
			if (map.borderColor) {
				var borderColor = map.borderColor.split(" ");
				map.borderTopColor = borderColor[0];
				map.borderRightColor = borderColor[1] || borderColor[0];
				map.borderBottomColor = borderColor[2] || borderColor[0];
				map.borderLeftColor = borderColor[3] || borderColor[1] || borderColor[0];
				delete map.borderColor;
			}

			if (map.borderLeft) {
				var border = map.borderLeft.split(" ");
				map.borderLeftWidth = border[0];
				if (border[1]) map.borderLeftStyle = border[1];
				if (border[2]) map.borderLeftColor = border[2];
				delete map.borderLeft;
			}
			if (map.borderTop) {
				var border = map.borderTop.split(" ");
				map.borderTopWidth = border[0];
				if (border[1]) map.borderTopStyle = border[1];
				if (border[2]) map.borderTopColor = border[2];
				delete map.borderTop;
			}
			if (map.borderRight) {
				var border = map.borderRight.split(" ");
				map.borderRightWidth = border[0];
				if (border[1]) map.borderRightStyle = border[1];
				if (border[2]) map.borderRightColor = border[2];
				delete map.borderRight;
			}
			if (map.borderBottom) {
				var border = map.borderBottom.split(" ");
				map.borderBottomWidth = border[0];
				if (border[1]) map.borderBottomStyle = border[1];
				if (border[2]) map.borderBottomColor = border[2];
				delete map.borderBottom;
			}

			// font

			//read font properties
			var font = map.font;
			var fontSize = map.fontSize;
			var fontWeight = map.fontWeight;
			var fontFamily = map.fontFamily;
			var lineHeight = map.lineHeight;
			var textColor = map.textColor;
			var color = map.color;
			var fontStyle=map.fontStyle;
			var textDecoration=map.textDecoration;
			var tmpFont;

			//check general font first
			if (font) {
				delete map.font;
				//try to resolve the font first, if it fails, parse it
				var tmpFont = unify.theme.Manager.get().resolveFont(font) || {};
				/*if(resolvedFont !== font){
					tmpFont = resolvedFont; //TODO: Object.clone(resolvedFont);
				} else {
					tmpFont = font; //TODO :Font.fromString(font);
				}*/
			} else {
				//no font set, reuse the existing or start from scratch
				tmpFont=this.__font||{}; //new unify.bom.Font();
			}

			//now check each property
			if (fontSize) {
				delete map.fontSize;
				if (typeof(fontSize) == "string" && fontSize.substr(-2) != "px") {
					tmpFont.fontSize = unify.bom.Font.resolveRelativeSize(fontSize);
				} else {
					tmpFont.fontSize = parseInt(fontSize, 10);
				}
				tmpFont.fontSize += "px";
			}

			if(fontWeight){
				delete map.fontWeight;
				tmpFont.weight = fontWeight; //setBold(fontWeight=="bold");
			}

			if (lineHeight) {
				delete map.lineHeight;
				tmpFont.lineHeight = lineHeight;
			}

			if (textColor) {
				delete map.textColor;
				tmpFont.setColor(/*unify.theme.Manager.get().resolveColor(*/textColor/*)*/);
			}

			if(fontStyle){
				delete map.fontStyle;
				tmpFont.style = fontStyle;
			}

			if(textDecoration){
				delete map.textDecoration;
				tmpFont.decoration = textDecoration;
			}

			//if something changed, update it
			if(font||fontSize||fontWeight||fontFamily||textColor||color||fontStyle||textDecoration||lineHeight){
				map = this.__mergeObjects(map, tmpFont);

				unify.ui.layout.queue.Layout.add(this);
			}

			this.__font = tmpFont;//cache font for later use
			var style = this.__style = this.__mergeObjects(this.__style||{},map);

			var padding = this.__padding = {
				left: parseInt(style.paddingLeft, 10) || 0,
				top: parseInt(style.paddingTop, 10) || 0,
				right: parseInt(style.paddingRight, 10)  || 0,
				bottom: parseInt(style.paddingBottom, 10) || 0
			};
			/*if (padding.left + padding.top + padding.right + padding.bottom > 0) {
				unify.ui.layout.queue.Layout.add(this);
			}*/

			var border = this.__border = {
				left: parseInt(style.borderLeftWidth, 10) || 0,
				top: parseInt(style.borderTopWidth, 10) || 0,
				right: parseInt(style.borderRightWidth, 10)  || 0,
				bottom: parseInt(style.borderBottomWidth, 10) || 0
			};
			/*if (border.left + border.top + border.right + border.bottom > 0) {
				unify.ui.layout.queue.Layout.add(this);
			}*/
			
			if (jasy.Env.getValue("engine") == "trident") {
				var version = /MSIE.(\d+)/.exec(navigator.userAgent);
				if (version[1] && parseInt(version[1],10) < 9) {
					// IE<9 only transform translation
					
					if (style.transform) {
						delete style.transform;
						/*var res = /translate.*(\d+).*(\d+)/.exec(style.transform);
						if (res) {
							var transformLeft = parseInt(res[1],10);
							var transformTop = parseInt(res[2],10);
							delete style.transform;
							var origPos = this.__elementPos || [0,0];
							this.__modificationPosition = [transformLeft, transformTop];
							style.left = (transformLeft + origPos[0]) + "px";
							style.top = (transformTop + origPos[1]) + "px";
						}*/
					}
				}
			}
			
			this.__setElementStyle(this.getElement(), style);

			if (properties) {
				var keys = Object.keys(properties);
				var firstUp = function(str) {
					return str[0].toUpperCase() + str.substring(1);
				};

				for (var i=0,ii=keys.length; i<ii; i++) {
					var key = keys[i];
					var value = properties[key];

					var setter = this["set" + firstUp(key)];
					if (setter) {
						setter.call(this, value);
					} else {
						this.error("Widget has no setter for property " + key)
					}
				}
			}
		},

		/**
		 * {Map} Get font of widget
		 */
		getFont : function() {
			return font = this.__font || {};
		},

		/* *
		 * Get style of element
		 * @param name {String} Style name to return
		 * @param computed {Boolean?false} Value should be computed
		 */
		/*getStyle : function(name, computed) {
			return this._getStyle(name, computed);
		},*/

		/**
		 * {String} Get style @name {String} of container element. If @computed {Boolean?false} flag
		 * is true style is calculated by browser.
		 */
		getOwnStyle : function(name, computed) {
			return this._getStyle(name, computed);
		},
		
		/**
		 * Set style @map {Map} of container element, only useful if widget does remote 
		 * children handling.
		 */
		setOwnStyle : function(map) {
			this._setStyle(map);
		},

		/**
		 * {var} Get style @name {String} of element. If @computed {Boolean?false} flag
		 * is true style is calculated by browser.
		 */
		_getStyle : function(name, computed) {
			var style = this.__style;
			var value = (style && style[name]);

			if (value) {
				return value;
			} else {
				return lowland.bom.Style.get(this.getElement(), name, computed);
			}
		},


		/**
		 * TODO: Does nothing
		 */
		hasUserBounds : function() {

		},

		/**
		 * {Boolean} Returns if widget is excluded from view
		 */
		isExcluded : function() {
			return this.getVisibility() === "excluded";
		},

		/**
		 * Removes widget from parent widget and adds it to dispose queue
		 */
		destroy : function() {
			if (this.isDisposed()) {
				return;
			}

			var parent = this.getParentBox();
			if (parent) {
				parent._remove(this);
			}
			
			unify.ui.layout.queue.Dispose.add(this);
		},




		__element : null,

		/**
		 * {Element} Returns the DOM element this widget creates
		 */
		getElement : function() {
			return this.__element;
		},
		
		/**
		 * {Element} Returns the base element events should be bound to
		 */
		getEventElement : function() {
			return this.__element;
		},

		/**
		 * Returns if the DOM element is created or not
		 * @return {Boolean} DOM element is created
		 */
		_hasElement : function() {
			return !!this.__element;
		},

		/**
		 * Creates DOM element
		 */
		_createElement : function() {
			throw "_createElement is not implemented";
		},

		/**
		 * Creates DOM element
		 *
		 * @return {Element} DOM element of widget
		 */
		__createElement : function() {
				var element = this._createElement();

				if (!element) {
					return null;
				}

				element.$$widget = this.getHash();

				var isDocFragment;
				if (jasy.Env.getValue("engine") == "trident") {
					isDocFragment = element.nodeName == "#document-fragment";
				} else {
					isDocFragment = element instanceof DocumentFragment;
				}
				if (!(isDocFragment)) {
					if(jasy.Env.getValue("debug")){
						element.setAttribute("unifyclass",this.constructor.toString());
						element.setAttribute("appearance",this.getAppearance());
					}

					var style = this.__style;
					if (style) {
						this._setStyle(style);
					}
					this.__setElementStyle(element, "visibility", "hidden");
				}

				return element;
		},

		/**
		 * Applies test id to element to help autmatic ui tests
		 */
		_applyTestId : function(value) {
			if(jasy.Env.getValue("debug") || jasy.Env.getValue("unify.testid")) {
				this.getElement().setAttribute("testid", value);
			}
		},

		__widgetChildren : null,

		/**
		 * Returns children of widget
		 * @return {unify.ui.core.Widget[]} Child widgets
		 */
		/*getChildren : function(){
			return this._getChildren();
		},*/

		/**
		 * {unify.ui.core.VisibleBox[]} Returns children of widget.
		 */
		_getChildren : function() {
			return this.__widgetChildren;
		},

		/**
		 * Recursively adds all children to the given @queue {Map}.
		 */
		addChildrenToQueue : function(queue)
		{
			var children = this.__widgetChildren;
			if (!children) {
				return;
			}

			var child;
			for (var i=0, l=children.length; i<l; i++)
			{
				child = children[i];
				queue.push(child);

				child.addChildrenToQueue(queue);
			}
		},

		/**
		 * Checks if widget has children
		 * @return {Boolean} Widget has children
		 */
		_hasChildren : function() {
			var children = this.__widgetChildren;
			return !!(children && children.length > 0);
		},

		/**
		 * {Integer} Returns the index position of the given widget @child {unify.ui.core.VisibleBox}
		 * if it is a child widget. Otherwise it returns <code>-1</code>.
		 */
		_indexOf : function(child)
		{
			var children = this.__widgetChildren;
			if (!children) {
				return -1;
			}

			return children.indexOf(child);
		},

		/**
		 * Adds new a @child {unify.ui.core.VisibleBox} widget to this widget.
		 * Optional an @options {Map?} map can be given defining layout data for widget.
		 * This parameters are documented in each layout manager.
		 */
		_add : function(child, options) {
			// When moving in the same widget, remove widget first
			if (child.getParentBox() == this) {
				core.Array.remove(this.__widgetChildren, child);
			}

			if (this.__widgetChildren) {
				this.__widgetChildren.push(child);
			} else {
				this.__widgetChildren = [ child ];
			}

			this.__addHelper(child, options);
		},


		/**
		 * Adds a new @child {unify.ui.core.VisibleBox} widget at the specified @index {Integer}.
		 * Optional an @options {Map?} map can be given defining layout data for widget.
		 */
		_addAt : function(child, index, options)
		{
			if (!this.__widgetChildren) {
				this.__widgetChildren = [];
			}

			// When moving in the same widget, remove widget first
			if (child.getParentBox() == this) {
				core.Array.remove(this.__widgetChildren, child);
			}

			var ref = this.__widgetChildren[index];

			if (ref === child) {
				return child.setLayoutProperties(options);
			}

			var widgetChildren = this.__widgetChildren;
			if (ref) {
				var pos = widgetChildren.indexOf(ref);
				core.Array.insertAt(widgetChildren, child, pos<0?null:pos);
			} else {
				widgetChildren.push(child);
			}

			this.__addHelper(child, options, index);
		},


		/**
		 * Add a widget before another already inserted widget
		 *
		 * @param child {LayoutItem} widget to add
		 * @param before {LayoutItem} widget before the new widget will be inserted.
		 * @param options {Map?null} Optional layout data for widget.
		 * @return {void}
		 */
		_addBefore : function(child, before, options)
		{
			if (jasy.Env.getValue("debug")) {
				this.assertInArray(before, this._getChildren(),
					"The 'before' widget is not a child of this widget!");
			}

			if (child == before) {
				return;
			}

			if (!this.__widgetChildren) {
				this.__widgetChildren = [];
			}

			var addAtIndex = this.__widgetChildren.indexOf(before);

			// When moving in the same widget, remove widget first
			if (child.getParentBox() == this) {
				core.Array.remove(this.__widgetChildren, child);
			}

			var widgetChildren = this.__widgetChildren;
			var pos = widgetChildren.indexOf(before);
			core.Array.insertAt(widgetChildren, child, pos<0?null:pos);

			this.__addHelper(child, options, addAtIndex);
		},


		/**
		 * Add a widget after another already inserted widget
		 *
		 * @param child {LayoutItem} widget to add
		 * @param after {LayoutItem} widget, after which the new widget will
		 *   be inserted
		 * @param options {Map?null} Optional layout data for widget.
		 * @return {void}
		 */
		_addAfter : function(child, after, options)
		{
			if (jasy.Env.getValue("debug")) {
				this.assertInArray(after, this._getChildren(),
					"The 'after' widget is not a child of this widget!");
			}

			if (child == after) {
				return;
			}

			if (!this.__widgetChildren) {
				this.__widgetChildren = [];
			}

			var addAtIndex = this.__widgetChildren.indexOf(after)+1;

			// When moving in the same widget, remove widget first
			if (child.getParentBox() == this) {
				core.Array.remove(this.__widgetChildren, child);
			}

			this.__widgetChildren.inesrtAt(child, this.__widgetChildren.indexOf(after)+1);

			this.__addHelper(child, options, addAtIndex);
		},


		/**
		 * Remove the given child widget.
		 *
		 * @param child {LayoutItem} the widget to remove
		 * @return {void}
		 */
		_remove : function(child)
		{
			if (!this.__widgetChildren) {
				throw new Error("This widget has no children!");
			}

			core.Array.remove(this.__widgetChildren, child);
			this.__removeHelper(child);
		},


		/**
		 * Remove the widget at the specified index.
		 *
		 * @param index {Integer} Index of the widget to remove.
		 * @return {unify.ui.core.VisibleBox} The removed item.
		 */
		_removeAt : function(index)
		{
			if (!this.__widgetChildren) {
				throw new Error("This widget has no children!");
			}

			var child = this.__widgetChildren[index];

			core.Array.removeAt(this.__widgetChildren, index);
			this.__removeHelper(child);

			return child;
		},


		/**
		 * Remove all children.
		 */
		_removeAll : function()
		{
			if (!this.__widgetChildren) {
				return;
			}

			// Working on a copy to make it possible to clear the
			// internal array before calling setLayoutParent()
			var children = core.Array.clone(this.__widgetChildren);
			this.__widgetChildren.length = 0;

			for (var i=children.length-1; i>=0; i--) {
				this.__removeHelper(children[i]);
			}

			unify.ui.layout.queue.Layout.add(this);
		},




		/*
		---------------------------------------------------------------------------
			CHILDREN HANDLING - TEMPLATE METHODS
		---------------------------------------------------------------------------
		*/

		/**
		 * This method gets called each time after a child widget was added and can
		 * be overridden to get notified about child adds.
		 *
		 * @signature function(child)
		 * @param child {unify.ui.core.VisibleBox} The added child.
		 */
		_afterAddChild : null,


		/**
		 * This method gets called each time after a child widget was removed and
		 * can be overridden to get notified about child removes.
		 *
		 * @signature function(child)
		 * @param child {unify.ui.core.VisibleBox} The removed child.
		 */
		_afterRemoveChild : null,




		__renderQueue : null,


		/*
		---------------------------------------------------------------------------
			CHILDREN HANDLING - IMPLEMENTATION
		---------------------------------------------------------------------------
		*/

		/**
		 * Convenience function to add a child widget. It will insert the child to
		 * the parent widget and schedule a layout update.
		 *
		 * @param child {LayoutItem} The child to add.
		 * @param options {Map|null} Optional layout data for the widget.
		 * @param index {Number|null} Optional index where to add the child
		 */
		__addHelper : function(child, options,index)
		{
			/* TODO: if (jasy.Env.getValue("debug"))
			{
				//this.assertInstance(child, unify.ui.core.VisibleBox, "Invalid widget to add: " + child);
				this.assertInstance(child, unify.ui.core.VisibleBox, "Invalid widget to add: " + child);
				this.assertNotIdentical(child, this, "Could not add widget to itself: " + child);

				if (options != null) {
					this.assertType(options, "object", "Invalid layout data: " + options);
				}
			}*/

			// Remove from old parent
			var parent = child.getParentBox();
			if (parent && parent != this) {
				parent._remove(child);
			}
			var element = child.getElement();
			
			//unify.bom.Style.set(element, "visibility", "hidden");
			
			var contentElem=this.getContentElement();
			var childNodes=contentElem.childNodes;

			var queue = this.__renderQueue;
			if(index!=null && index >=0 && index < childNodes.length){
				var c = queue.indexed[index];
				if (c) {
					c.push(element);
				} else {
					queue.indexed[index] = [element];
				}
				//Array.insertAt(queue.indexed, element, index);
				//contentElem.insertBefore(element,childNodes[index]);
			} else {
				queue.append.push(element);
				//contentElem.appendChild(element);
			}
			this._getLayout().invalidateLayoutCache();

			// Remember parent
			child.setParentBox(this);

			
			unify.ui.layout.queue.Visibility.add(this);

			// Import options: This call will
			//  - clear the layout's children cache as well and
			//  - add its parent (this widget) to the layout queue
			if (options) {
				child.setLayoutProperties(options);
			} else {
				this.updateLayoutProperties();
			}

			// call the template method
			if (this._afterAddChild) {
				this._afterAddChild(child);
			}
		},


		/**
		 * Convenience function to remove a child widget. It will remove it
		 * from the parent widget and schedule a layout update.
		 *
		 * @param child {LayoutItem} The child to remove.
		 */
		__removeHelper : function(child) {
			if (this.isDisposed()) {
				if (jasy.Env.isSet("debug")) {
					console.warn(this + " is disposed, so no child removal");
				}
				return;
			}

			if (jasy.Env.getValue("debug")) {
				if (!child) {
					throw new Error("Can not remove undefined child!");
				}
			}

			if (child.getParentBox() !== this) {
				throw new Error("Remove Error: " + child + " is not a child of this widget!");
			}

			var element = child.getElement();

			// Check if element is in virtual DOM render queue.
			// If so, remove it from there, otherwise it is a real DOM element that must be removed from DOM.
			var queue = this.__renderQueue;
			var indexed = queue.indexed;
			var isVirtualAppendedElement = !!core.Array.remove(queue.append, element);
			if (!isVirtualAppendedElement) {
				var isVirtualIndexedElement = false;
				for (var key in indexed) {
					var indexedArray = indexed[key];
					isVirtualIndexedElement = !!core.Array.remove(indexedArray, element);

					if (isVirtualIndexedElement) {
						break;
					}
				}

				if (!isVirtualIndexedElement) {
					// Element is in DOM, so remove it there
					this.getContentElement().removeChild(element);
				}
			}

			this._getLayout().invalidateLayoutCache();

			// Clear parent connection
			child.setParentBox(null);

			// clear the layout's children cache
			if (this.__layoutManager) {
				this.__layoutManager.invalidateChildrenCache();
			}

			// Add to layout queue
			unify.ui.layout.queue.Layout.add(this);

			// call the template method
			if (this._afterRemoveChild) {
				this._afterRemoveChild(child);
			}
		},
		
		/**
		 * Invalidates layout cache so this visible box is layouted in next running
		 * of layout queue if added.
		 */
		invalidateLayoutCache : function() {
			unify.ui.core.VisibleBox.prototype.invalidateLayoutCache.call(this);

			if (this.__layoutManager) {
				this.__layoutManager.invalidateLayoutCache();
			}
		},

		dispose : function(forceNow) {
			if (forceNow) {
				unify.ui.core.VisibleBox.prototype.dispose.call(this);
			} else {
				unify.ui.layout.queue.Dispose.add(this);
			}
		},
		
		/**
		 * Destructor
		 */
		destruct : function() {
			var parentBox = this.getParentBox();
			if (parentBox) {
				parentBox.remove(this);
			}
			this._disposeArrays(this.__widgetChildren);
			this._disposeObjects(this.__layoutManager, this.__element, this.__nativeListenerRegistry);
			
			unify.ui.core.VisibleBox.prototype.destruct.call(this);

			unify.ui.layout.queue.Layout.remove(this);
		}
	}
});



unify.core.Statics.annotate(unify.ui.core.Widget, {
	/**
	 * Returns the widget, which contains the given DOM element.
	 *
	 * @param element {Element} The DOM element to search the widget for.
	 * @param considerAnonymousState {Boolean?false} If true, anonymous widget
	 *   will not be returned.
	 * @return {unify.ui.core.Widget} The widget containing the element.
	 */
	getByElement : function(element, considerAnonymousState) {
		var widgetKey = element.$$widget;
		return lowland.ObjectManager.find(widgetKey);
		/*
		
		// TODO
		while(element) {
			var widgetKey = element.$$widget;
	
			// dereference "weak" reference to the widget.
			if (widgetKey != null) {
				// TODO : var widget = ObjectRegistry.fromHashCode(widgetKey);
				// check for anonymous widgets
				if (!considerAnonymousState || !widget.getAnonymous()) {
					return widget;
				}
			}
	
			// Fix for FF, which occasionally breaks (BUG#3525)
			try {
				element = element.parentNode;
			} catch (e) {
				return null;
			}
		}
		return null;*/
	},
	
	/**
	 * Check if widget contains child widget.
	 *
	 * @param parent {unify.ui.core.Widget} Parent widget
	 * @param child {unify.ui.core.Widget} Child widget
	 * @return {Boolean} If parent contains child, return true
	 */
	contains : function(parent, child) {
		while (child) {
			if (parent == child) {
				return true;
			}
	
			child = child.getParentBox();
		}
	
		return false;
	}
});
