# Magic Resolver for Ember

Magic Resolver adds support for named exports to the Ember CLI module system, allowing developers to group related classes into larger modules. It also lets filenames themselves represent additional levels of nesting, obviating the need for subdirectories whose sole purpose is to hold a few template files.


## Introduction

As Ember transitions to a module-based system, the framework will generally enforce a *one class per file* parity for automatic route-based lookups. The bundled resolver — responsible for locating classes and templates — is only interested in the default export of a module, and hence each module must directly correspond to a single class for it to be recognized by the resolver.

The hierarchy that was previously reflected in the names registered on the global application instance (e.g., `App.FooBarRoute`) will now be determined by the directory structure of the source tree. Going forward, the `Route` for `foo.bar` can only be specified in the files `/foo/bar/route.js` or `/routes/foo/bar.js`.

Magic Resolver provides an alternative solution for developers who prefer to keep related logic together and avoid a proliferation of tiny files and subdirectories. It does this by making the class lookups aware of named exports and by searching every level of the default module path according to a flexible naming system.

In the above example case, the class from `/routes/foo/bar.js` could instead be placed with other `foo`-related items in `/routes/foo.js`. As long as the exported class is named `Bar` or `FooBar`, it will be found when the resolver gets a request for `foo.bar`.


## Installation

*   Install package:

    ```
    npm install --save-dev ember-magic-resolver
    ```

*   In `app.js`, switch to Magic Resolver by declaring:

    ```
    import Resolver from 'magic-resolver';
    ```


## Usage

### Classes

Let's say we have a deeply nested route `foo.bar.baz.quux`. In the past, the associated classes would be registered on the global application object under a full name like `App.FooBarBazQuuxController`.

In the new module-based system, Ember will look for the same class under the module `/controllers/foo/bar/baz/quux.js` and its pod-based equivalent `/foo/bar/baz/quux/controller.js` but nowhere else.

With Magic Resolver, developers can pick any option between these two extremes. You could choose to place a `FooBarBazQuuxController` class in the top-level module `/foo.js`, or you might place a `BazQuuxController` (or simply `QuuxController`) in the module `/foo/bar/baz.js`.

In more general terms, you can remove a class from a subdirectory, place it in an upper level module, and incorporate the omitted subpath in the name of the exported class.

Modules are searched in a descending order of specificity. The most deeply nested module `/controllers/foo/bar/baz/quux` would be looked up first, meaning that Magic Resolver is directly compatible with the bundled resolver and merely extends its lookup logic when nothing is found in the default location.

#### Classic directory structure

##### Before

/routes/posts/comments.js

```javascript
export default Ember.Route.extend({ ... }); // posts.comments
```

/routes/posts/comments/new.js

```javascript
export default Ember.Route.extend({ ... }); // posts.comments.new
```

##### After

/routes/posts/comments.js

```javascript
var BaseRoute = Ember.Route.extend({ ... }); // posts.comments

var NewRoute = Ember.Route.extend({ ... }); // posts.comments.new

export {BaseRoute, NewRoute}
```

The base name may be prefixed to the class names. The above could also be written as:

```javascript
var CommentsRoute = Ember.Route.extend({ ... }); // posts.comments

var CommentsNewRoute = Ember.Route.extend({ ... }); // posts.comments.new

export {CommentsRoute, CommentsNewRoute}
```

A third option is to treat the base route as a default export and only the nested routes as named exports:

```javascript
export default Ember.Route.extend({ ... }); // posts.comments

var NewRoute = Ember.Route.extend({ ... }); // posts.comments.new

export {NewRoute}
```

##### Multiple levels of nesting

Nesting can extend to an arbitrary level. Continuing with the example, you might do away with the 'posts' directory as well and put everything in a top-level module:

/routes/posts.js

```javascript
var BaseRoute = Ember.Route.extend({ ... }); // posts

var CommentsRoute = Ember.Route.extend({ ... }); // posts.comments

var CommentsNewRoute = Ember.Route.extend({ // posts.comments.new
    ...
});

export {BaseRoute, CommentsRoute, CommentsNewRoute}
```

Again, `BaseRoute` may alternatively be exported as `PostsRoute` or `default`, `CommentsRoute` may be named `PostsCommentsRoute`, and so on.

#### Pod directory structure

The exact same procedure works in a pod structure.

##### Before

/pods/posts/comments/route.js

```javascript
export default Ember.Route.extend({ ... }); // posts.comments
```

/pods/posts/comments/new/route.js

```javascript
export default Ember.Route.extend({ ... }); // posts.comments.new
```

##### After

/pods/posts/comments/route.js

```javascript
var BaseRoute = Ember.Route.extend({ ... }); // posts.comments

var NewRoute = Ember.Route.extend({ ... }); // posts.comments.new

export {BaseRoute, NewRoute}
```

Prefixing the base name:

```javascript
var CommentsRoute = Ember.Route.extend({ ... }); // posts.comments

var CommentsNewRoute = Ember.Route.extend({ ... }); // posts.comments.new

export {CommentsRoute, CommentsNewRoute}
```

Using a default export:

```javascript
export default Ember.Route.extend({ ... }); // posts.comments

var NewRoute = Ember.Route.extend({ ... }); // posts.comments.new

export {NewRoute}
```

##### Multiple levels of nesting

/pods/posts/route.js

```javascript
var BaseRoute = Ember.Route.extend({ ... }); // or 'PostsRoute' or a default export

var CommentsRoute = Ember.Route.extend({ ... }); // or 'PostsCommentsRoute'

var CommentsNewRoute = Ember.Route.extend({ ... }); // or 'PostsCommentsNewRoute'

export {BaseRoute, CommentsRoute, CommentsNewRoute}
```

### Templates

Since multiple templates cannot be combined in a single file, there's an alternative method of storing a template on its parent level in the filesystem: express the path segments *in the filename* separated by a dot.

#### Classic directory structure

##### Before

/templates/posts/comments.hbs  
/templates/posts/comments/**new.hbs**

##### After

/templates/posts/comments.hbs  
/templates/posts/**comments.new.hbs**

##### Multiple levels of nesting

/templates/posts.hbs  
/templates/posts.comments.hbs  
/templates/posts.comments.new.hbs

#### Pod directory structure

##### Before

/pods/posts/comments/template.hbs  
/pods/posts/comments/new/template.hbs

##### After

/pods/posts/comments/template.hbs  
/pods/posts/comments/template.new.hbs

Observe that in the pod variant the nested segments appear *after* "template" in order to keep the filenames grouped together.

##### Multiple levels of nesting

/pods/posts/template.hbs  
/pods/posts/template.comments.hbs  
/pods/posts/template.comments.new.hbs


## Module matching logic

### A full example

When the route `one.two.three` is requested, the resolver will look for modules and exports in the following order (export names in brackets):

```
/{podDir}/one/two/three/route.js [default]
/{podDir}/one/two/three/route.js [BaseRoute]
/{podDir}/one/two/three/route.js [ThreeRoute]

/routes/one/two/three.js [default]
/routes/one/two/three.js [BaseRoute]
/routes/one/two/three.js [ThreeRoute]

/{podDir}/one/two/route.js [ThreeRoute]
/{podDir}/one/two/route.js [TwoThreeRoute]

/routes/one/two.js [ThreeRoute]
/routes/one/two.js [TwoThreeRoute]

/{podDir}/one/route.js [TwoThreeRoute]
/{podDir}/one/route.js [OneTwoThreeRoute]

/routes/one.js [TwoThreeRoute]
/routes/one.js [OneTwoThreeRoute]
```

### Logging

To see what's going on, set `ENV.APP.LOG_RESOLVER = true` in 
`{application root}/config/environment.js`.

Interpretation:

```
[ ] route:foo/bar ........ app/routes/foo/bar               did not find module
                                                            /routes/foo/bar

[ ] route:foo/bar ........ app/routes/foo ✓                 found module /routes/foo
                                                            but no matching export

[✓] route:foo/bar ........ app/routes/foo/bar[default]      found matching default export
                                                            in module /routes/foo/bar

[✓] route:foo/bar ........ app/routes/foo[Bar]              found matching export 'Bar'
                                                            in module /routes/foo
```


## Development status and version support

The resolver has been tested on Ember 1.7.0 (Ember CLI 0.1.2) and Ember 1.8.1 (Ember CLI 0.1.4). However, it is at an experimental stage. If you find a problem, please file an issue.

