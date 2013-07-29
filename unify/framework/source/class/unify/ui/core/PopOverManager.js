/*
===============================================================================================

		Unify Project

		Homepage: unify-project.org
		License: MIT + Apache (V2)
		Copyright: 2009-2011 Deutsche Telekom AG, Germany, http://telekom.com
							2012 Sebastian Fastner, Mainz, Germany, http://unify-training.com

===============================================================================================
*/


(function () {
	var zIndexBase = 100;
	
/**
 * Handles pop over stacking (and blocking elements)
 */
core.Class("unify.ui.core.PopOverManager", {
	include : [unify.core.Object],
	
	/*
	----------------------------------------------------------------------------
		CONSTRUCTOR
	----------------------------------------------------------------------------
	*/
		
	construct : function() {
		unify.core.Object.call(this);
		
		var root = this.__root = unify.core.Init.getApplication().getViewportRoot();
		this.__visibleOverlays = [];
		this.__overlays={};
		this.__styleRegistry = {};
		
		//zIndexBase = 0; // jasy.Env.getValue("unify.config.zIndexBase") || zIndexBase;
		
		var pblocker = this.__pblocker = document.createElement("div");
		var pstyle = unify.theme.Manager.get().resolveStyle("POPOVER-BLOCKER");
		pstyle.display = "none";
		lowland.bom.Style.set(pblocker, pstyle);
		pblocker.id = "popover-blocker";
		
		var mblocker = this.__mblocker = document.createElement("div");
		var mstyle = unify.theme.Manager.get().resolveStyle("MODAL-BLOCKER");
		mstyle.display = "none";
		lowland.bom.Style.set(mblocker, mstyle);
		mblocker.id = "modal-blocker";
		
		this.addNativeListener(pblocker, "tap", this.__onTapBlocker, this);

		// Give the browser some time to do stuff to be ready to insert the
		// blocker elements. This way, the UI seems much more responsive,
		// especially on 'slow' devices, e.g. iPad
		(function fn() {
			var rootElement = root.getViewportElement();
			rootElement.appendChild(pblocker);
			rootElement.appendChild(mblocker);
		}.lazy());
	},
	
	events : {
		/** Show popup event */
		"show" : core.event.Simple,
		
		/** Hide popup event */
		"hide" : core.event.Simple
	},
	
	properties : {
		"autoResize" : {
			type: "Boolean",
			init: false,
			apply : function(value, old) { if (value !== old) { this.__applyAutoResize(value); }}
		}
	},

	/*
	----------------------------------------------------------------------------
		MEMBERS
	----------------------------------------------------------------------------
	*/
		
	members :
	{
		__root : null,
		__visibleOverlays : null,
		__pblocker : null,
		__mblocker : null,
		
		__getDocHeight : function() {
			return Math.max(
				Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
				Math.max(document.body.offsetHeight, document.documentElement.offsetHeight),
				Math.max(document.body.clientHeight, document.documentElement.clientHeight)
			);
		},
		
		__resizeHandler : function(e) {
			var height = this.__getDocHeight() + "px";
			lowland.bom.Style.set(this.__mblocker, "height", height);
			lowland.bom.Style.set(this.__pblocker, "height", height);
		},
		
		__applyAutoResize : function(value) {
			if (value) {
				this.addNativeListener(window, "resize", this.__resizeHandler, this);
				this.__resizeHandler();
			} else {
				this.removeNativeListener(window, "resize", this.__resizeHandler, this);
			}
		},
		
		move : function(left, top) {
			var style = {
				left: left + "px",
				top: top + "px"
			};
			lowland.bom.Style.set(this.__mblocker, style);
			lowland.bom.Style.set(this.__pblocker, style);
		},
		
		/**
		 * Applies correct zIndex to all visible pop-overs
		 * and positions blocker below the topmost visible popover.
		 */
		__sortPopOvers : function()
		{
			var visible = this.__visibleOverlays;
			var pblocker = this.__pblocker;
			var mblocker = this.__mblocker;

			var numVisible = visible.length;
			for (var i=0; i<numVisible; i++) {
				var widget = visible[i];
				if (widget.setOuterStyle) {
					widget.setOuterStyle({zIndex: zIndexBase + 2*i});
				} else {
					widget.setStyle({zIndex: zIndexBase + 2*i});
				}
			}
      
			if (numVisible > 0) {
				var mSet=false;
				var pSet=false;
				for(var i=numVisible-1;i>=0;i--){
					var type;
					//Check which interface is used atm.
					if(visible[i].getPopUpType){
						type = visible[i].getPopUpType();
					} else {
						//Show warn only in debug mode
						if (jasy.Env.getValue("debug")) {
							console.warn("unify.ui.core.IPopOver is deprecated and will be replaced by unify.ui.core.IPopUp");
						}
						//we assume old interface here
						type = visible[i].getModal();
					}
					//if type is boolean we assume the old interface is used
					if( (!mSet && type === true) || (!mSet && type === "modal") ){
						var styleState = visible[i].getUserData("blockerState");
						if (styleState) {
							var val = styleState;
							styleState = {};
							styleState[val] = true;
						}
						var style = unify.theme.Manager.get().resolveStyle("MODAL-BLOCKER") || {};
						style.zIndex = (zIndexBase-1)+2*i;
						style.display = 'block';
						lowland.bom.Style.set(mblocker, style);
						mSet = true;

					} else if ( (!pSet && type === false) || (!pSet && type === "popup") || (!pSet && type === "popover")){
						var styleState = visible[i].getUserData("blockerState");
						if (styleState) {
							var val = styleState;
							styleState = {};
							styleState[val] = true;
						}
						var style = unify.theme.Manager.get().resolveStyle("POPOVER-BLOCKER") || {};
						style.zIndex = (zIndexBase-1)+2*i;
						style.display = 'block';
						lowland.bom.Style.set(pblocker, style);
						pSet = true;

					//The info popup has no blocker element
					} else if(!pSet && type === "info"){
						var styleState = visible[i].getUserData("blockerState");
						if (styleState) {
							var val = styleState;
							styleState = {};
							styleState[val] = true;
						}
						//turn of blocker. Fix for multiple popups with different types
						pSet = false;
					}

					if (mSet&&pSet) {
						break;
					}
				}
        
				if(!mSet){
					lowland.bom.Style.set(mblocker, {
						zIndex: null,
						display: "none"
					});
				}
				if(!pSet){
					lowland.bom.Style.set(pblocker, {
						zIndex: null,
						display: "none"
					});
				}
			} else {
				lowland.bom.Style.set(mblocker, {
					zIndex: null,
					display: "none"
				});
				lowland.bom.Style.set(pblocker, {
					zIndex: null,
					display: "none"
				});
			}
		},

		/**
		 * Closes topmost popover
		 */
		__onTapBlocker : function(){
			var numVisible = this.__visibleOverlays.length;
			
			if (numVisible > 0) {
				var topMost = this.__visibleOverlays[numVisible-1];
				this.hide(topMost);
			} else {
				this.error("tapped on blocker without visible viewmanager");
				//sort popovers again to make sure the blocker is gone
				this.__sortPopOvers();
			}
		},

		/**
		 * Shows the view manager with the given ID.
		 *
		 * @param widget {unify.ui.core.IPopOver} Widget to show
		 * @param position {String|Map|unify.ui.Widget?"center"} Position of widget ("center", "window", {left:50,top:50}) or trigger widget
		 */
		show : function(widget, position) {
			if (jasy.Env.getValue("debug")) {
				this.debug("Show: " + (widget&&widget.constructor));
				//should be switched to IPopUp in the future
				core.Interface.assert(widget, unify.ui.core.IPopUp);
			}
			var pos = position || "center";

			if (core.Class.isClass(pos.constructor) && pos.constructor instanceof unify.ui.core.Widget.constructor) {
				
				if (widget.setTrigger) {
					widget.setTrigger(pos);
					pos = widget.getPositionHint();
				} else {
					pos = null;
				}
			} else if(typeof pos === "string"){
					switch(pos)
					{
						case "full" :
							pos = {left: 0, top: 0, right: 0, bottom: 0};
							break;
						
						case "top" :
							pos = {top: 0, left: "center"};
							break;
						
						case "left" :
							pos = {top: "center", left: 0};
							break;
						
						case "right":
							pos = {top: "center", right: 0};
							break;
						
						case "bottom":
							pos = {bottom: 0, left: "center"};
							break;
						
						default :
							this.debug("Unknown Key for PopUp position; using center instead");
						case "center" :
						case "window" :
							pos = {left: "center", top: "center"};
							break;
				}
			} else if(!(typeof pos === "object" && pos.top && pos.left)){ //check if pos is already a position map
				//if not make default position
				pos = {left: "center", top: "center"};
			}
			
			this.__root.add(widget, pos);
			this.__visibleOverlays.push(widget);
			this.__sortPopOvers();
			
			widget.show();
			if (widget.getTrigger && widget.getTrigger()) {
				var trigger = widget.getTrigger();
				if (trigger.getHoverForPopover && trigger.getHoverForPopover()) {
					unify.ui.core.Util.domElementToRootLevel(trigger);
				}
			}
			
			this.fireEvent("show", widget);
		},
		
		
		/**
		 * Hides the view manager with the given ID.
		 *
		 * @param widget {unify.ui.core.IPopOver} Widget to hide
		 */
		hide : function(widget) {
			var self = this;
			
			var hideCallback=function(){
				core.Array.remove(self.__visibleOverlays, widget);
				self.__sortPopOvers();

        // IE Hack [start]
        // Unfortunately, IE 10 (and probably earlier version, too) do not
        // always apply the correct z-index if the z-index is altered on the
        // fly. To circumvent this, we force the rendering engine to redraw
        // the blocker to apply correct z-index values/renderings.
        if (jasy.Env.getValue('engine') === 'trident') {
          // Increase blocker size by a tiny bit
          lowland.bom.Style.set(this.__mblocker, 'width', (100 + Math.random()) + '%');
          var delay = (function() {
            // Reset blocker to correct size
            lowland.bom.Style.set(this.__mblocker, 'width', '100%');
          }).lowDelay(0, this);
        }
        // IE Hack [end]
				
				self.fireEvent("hide", widget);
			};

			widget.addListenerOnce("changeVisibility", hideCallback, this);
			widget.hide();

      if (widget.getTrigger && widget.getTrigger()) {
        var trigger = widget.getTrigger();
        if (trigger.getHoverForPopover && trigger.getHoverForPopover()) {
          unify.ui.core.Util.domElementToTreeLevel(trigger);
        }
      }
		}
	}
});

unify.core.Singleton.annotate(unify.ui.core.PopOverManager);

})();
