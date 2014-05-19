/*
===============================================================================================

		Unify Project

		Homepage: unify-project.org
		License: MIT + Apache (V2)
		Copyright: 2010, Sebastian Fastner, Mainz, Germany, http://unify-training.com

===============================================================================================
*/

/**
 * EXPERIMENTAL
 */
core.Class("unify.ui.basic.Atom", {
	include: [unify.ui.core.Widget, unify.ui.core.MChildControl, unify.ui.core.MChildrenHandling],
	
	/**
	 * @param label {String} Label on atom
	 * @param image {String} Image url
	 */
	construct : function(label, image) {
		unify.ui.core.Widget.call(this);
		unify.ui.core.MChildControl.call(this);
		
		this._forwardStates = {
			"hover" : true,
			"pressed" : true,
			"checked" : true,
			"disable" : true
		};
		
		this._setLayout(new unify.ui.layout.special.AtomLayout());
		if (label) {
			this.setText(label);
		}
		if (image) {
			this.setImage(image);
		}
	},
	
	properties : {
		/** Position of image */
		direction : {
			type : "String",
			init : "top"
		},
		
		// overridden
		appearance : {
			init: "atom"
		},
		
		text : {
			init: null,
			apply: function(value) { this._applyText(value); }
		},
		
		image : {
			init: null,
			apply: function(value) { this._applyImage(value); }
		}
	},
	
	members: {
		setStyle : unify.ui.core.MChildrenHandling.prototype.setStyle,
		_afterAddChild : unify.ui.core.MChildrenHandling.prototype._afterAddChild,
		_afterRemoveChild : unify.ui.core.MChildrenHandling.prototype._afterRemoveChild,
		
		__imageWidget : null,
		__labelWidget : null,
		
		_createElement : function() {
			return document.createElement("div");
		},
		
		/**
		 * Returns child control widget identified by id
		 *
		 * @param id {String} ID of child widget
		 * @return {unify.ui.core.Widget} Content widget
		 */
		_createChildControlImpl : function(id) {
			var control;

			if (id == "label") {
				control = new unify.ui.basic.Label();
				this._add(control, {type: "label"});
			} else if (id == "image") {
				control = new unify.ui.basic.Image();
				control.setScale(true);
				this._add(control, {type: "image"});
			}

			return control || this.base(arguments, id);
		},
		
		/**
		 * Set source of image
		 *
		 * @param value {String} URL of image
		 */
		_applyImage : function(value) {
			var image = this._showChildControl("image");
			image.setSource(value);
		},
		
		/**
		 * Set text on label
		 *
		 * @param value {String} Label text
		 */
		_applyText : function(value) {
			var label = this._showChildControl("label");
			label.setValue(value);
			//added title dom element for atoms
			//this.getElement().setAttribute("title", value);

		},
		
		destruct : function() {
			unify.ui.core.MChildControl.prototype.destruct.call(this);
			unify.ui.core.Widget.prototype.destruct.call(this);
		}
	}
});
