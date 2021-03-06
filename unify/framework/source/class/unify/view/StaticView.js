/*
===============================================================================================

		Unify Project

		Homepage: unify-project.org
		License: MIT + Apache (V2)
		Copyright: 2009-2010 Deutsche Telekom AG, Germany, http://telekom.com

===============================================================================================
*/

/**
 * A view is basically a combination two parts from the typical MVC model:
 * a controller for the UI and the UI itself. It creates the UI logic
 * and binds it into the application logic / business layer.
 *
 * Each view consists at least of a {@link unify.ui.Layer} which
 * creates and manages the top level DOM element of each view.
 *
 * Each view is controlled by the {@link ViewManager} which toggles the visibility
 * of the layers and manage their insertion to the DOM.
 *
 * The instance of the view is created as soon as needed in a lazy pattern.
 * Each view is a singleton which may be used at different positions in navigation
 * e.g. list->entry->user->list->entry. Each view is identified in history by
 * the hyphenated class name e.g. myapp.view.MailList => "mail-list".
 *
 * Applications using this view-controller based Unify architecture got a lot
 * of functionality of typical iPhone application with automatic navigation paths,
 * history managment, recovery, automatic transitions etc. This might not make
 * a lot of sense sense for application doing mostly fullscreen things like games.
 */
core.Class("unify.view.StaticView",
{
	include : [unify.ui.container.Composite, unify.fx.MWidgetAnimation],
	
	
	/**
	 * Constructor. A @layout {unify.ui.layout.Base?null} can be given.
	 */
	construct : function(layout)
	{
		unify.ui.container.Composite.call(this, layout || new unify.ui.layout.VBox());
		unify.fx.MWidgetAnimation.call(this);
		
		var className = this.constructor.className.split(".").pop();
		className = className[0].toLowerCase() + className.substring(1);
		this.__id = core.String.hyphenate(className);
	},
	


	/*
	----------------------------------------------------------------------------
		 EVENTS
	----------------------------------------------------------------------------
	*/

	events :
	{
		/** Fired when the view appears on the screen */
		"appear" : core.event.Simple,

		/** Fired when the view disappears on the screen */
		"disappear" : core.event.Simple,

		/** Fired every time the title may have changed through new conditions */
		"changeTitle" : core.event.Simple,
		
		/** Fired every time the parent changed */
		"changeParent" : core.event.Simple
	},



	/*
	----------------------------------------------------------------------------
		 PROPERTIES
	----------------------------------------------------------------------------
	*/

	properties :
	{
		/*
		---------------------------------------------------------------------------
			INTERNALLY CONFIGURED
		---------------------------------------------------------------------------
		*/

		/**
		 * Attached view manager instance.
		 * (This is automatically set up through the {@link ViewManager}) 
		 */
		manager : 
		{
			type : unify.view.ViewManager,
			nullable : true
		},

		/** 
		 * The parent of the view 
		 * (This is automatically set up through the {@link ViewManager})  
		 */
		parent :
		{
			type : unify.view.StaticView,
			nullable : true,
			apply : function(value, old) { this._applyParent(value, old) },
			fire : "changeParent"
		},
		
		/** 
		 * Whether the view is active 
		 * (This is automatically set up through the {@link ViewManager}) 
		 */
		active : {
			type : "Boolean",
			init : false,
			apply : function(value, old) { this._applyActive(value, old) },
			fire : "changeActive"
		},

		/** 
		 * The current param of this view (for dynamic content) 
		 * (This is automatically set up through the {@link ViewManager}) 
		 */
		param :
		{
			type : "String",
			nullable : true,
			apply :function(value, old) { this._applyParam(value, old) }
		},

		/** 
		 * Support for segment switches in the view 
		 * (This is automatically set up through the {@link ViewManager}) 
		 */
		segment :
		{
			type : "String",
			nullable : true,
			apply : function(value, old) { this._applySegment(value, old) },
			fire : "changeSegment"
		},
		
		/** {String?null} Appearance ID of widget used by theme system */
		appearance : {
			init: "view"
		}
	},




	/*
	----------------------------------------------------------------------------
		 MEMBERS
	----------------------------------------------------------------------------
	*/

	members :
	{
		/*
		---------------------------------------------------------------------------
			PUBLIC API
		---------------------------------------------------------------------------
		*/

		/** {String} View ID */
		__id : null,

		/**
		 * Returns the ID of the view. This ID is constructed by its classname
		 *
		 * @return {String} View ID
		 */
		getId : function() {
			return this.__id;
		},


		/**
		 * {String|null} Parametrized views may have a default parameter which is
		 * auto-selected by the view manager when no explicit parameter
		 * is given.
		 */
		getDefaultSegment : function() {
			return null;
		},


		/** {unify.ui.Layer} Stores the layer instance of the view. */
		__layer : null,
		
		/**
		 * Returns the layer of this view. Dynamically creates it if not yet happened.
		 *
		 * @final
		 * @return {unify.ui.Layer} Layer instance
		 */
		getLayer : function() {
			return this.__layer || this.create();
		},


		/**
		 * Returns the DOM element of this view.
		 *
		 * @return {Element} DOM element of the view (root element)
		 */
		getElement : function() {
			//return this.getLayer().getElement();
			//console.error("getElement");
			var e = unify.ui.container.Composite.prototype.getElement.call(this); //this.base(arguments);
			core.bom.ClassName.add(e, "layer");
			return e;
		},


		/**
		 * {String} Returns the title of the view. @type {String?null} is an optional parameter defining position for title.
		 * This is helpful for short title, title for titlebar, tabbar etc. and depends on view.
		 */
		getTitle : function(type) {
			return "Default";
		},
		
		/**
		 * {String|null} Returns the icon of the view. @type {String?null} is an optional parameter defining position for title.
		 * This is helpful for short title, title for titlebar, tabbar etc. and depends on view.
		 */
		getIcon : function(type) {
			return null;
		},


		/**
		 * Whether the DOM reprensentation of this view is created.
		 *
		 * @final
		 * @return {Boolean} <code>true</code> when the layer is created
		 */
		isCreated : function() {
			return !!this.__layer;
		},




		/*
		---------------------------------------------------------------------------
			LIFE CYCLE
		---------------------------------------------------------------------------
		*/

		/**
		 * Create the DOM representation of the view
		 *
		 * @final override {@link #_createView} instead
		 */
		create : function()
		{
			var now = +(new Date());
			this._createView();
			if (jasy.Env.getValue("debug")) {
				this.debug("Created in: " + ((new Date()) - now) + "ms");
			}
			this.__layer = true;
		},


		/**
		 * Property apply
		 *
		 * @final
		 */
		_applyActive : function(value, old)
		{
			if (value)
			{
				// Check whether we need to create the layer
				if (!this.__layer) {
					this.create();
				}
				
				this._resumeView();
			}
			else
			{
				this._pauseView();
			}
		},




		/*
		---------------------------------------------------------------------------
			OVERRIDEABLE INTERFACE
		---------------------------------------------------------------------------
		*/

		/**
		 * Method which creates the layer required by {@link #getLayer}. This should
		 * be overwritten in derived classes to create the visual representation as
		 * needed.
		 *
		 * @abstract
		 * @return {unify.ui.Layer} Return the layer instance of this view.
		 */
		_createView : function()
		{
			if (jasy.Env.getValue("debug")) {
				throw new Error(this.toString() + " needs implementation for _createView()!")
			}
		},


		/**
		 * This method is executed when the view is going to be activated.
		 */
		_resumeView : function() {
			// Nothing to do here
		},


		/**
		 * This method is executed when the view is going to be deactivated.
		 */
		_pauseView : function() {
			// Nothing to do here
		},



		/*
		---------------------------------------------------------------------------
			PROPERTY APPLY
		---------------------------------------------------------------------------
		*/

		
		
		// property apply
		_applyParent : function() {   
		},
		
		
		// property apply
		_applyParam : function() {
			// nothing to do here
		},
		
		
		// property apply
		_applySegment : function() {
			// nothing to do here
		}
	}
});
