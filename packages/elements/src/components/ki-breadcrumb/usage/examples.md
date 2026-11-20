## Show the path to the current page

```html
<ki-breadcrumb label="Project path">
  <ki-breadcrumb-item href="/workspace">Workspace</ki-breadcrumb-item>
  <ki-breadcrumb-item href="/workspace/projects">Projects</ki-breadcrumb-item>
  <ki-breadcrumb-item current>Settings</ki-breadcrumb-item>
</ki-breadcrumb>
```

## Collapse middle levels

```html
<ki-breadcrumb label="Release path" max-items="4">
  <ki-breadcrumb-item href="/workspace">Workspace</ki-breadcrumb-item>
  <ki-breadcrumb-item href="/projects">Projects</ki-breadcrumb-item>
  <ki-breadcrumb-item href="/projects/kimen">Kimen</ki-breadcrumb-item>
  <ki-breadcrumb-item href="/projects/kimen/packages">Packages</ki-breadcrumb-item>
  <ki-breadcrumb-item href="/projects/kimen/releases">Releases</ki-breadcrumb-item>
  <ki-breadcrumb-item current>v2.4.0</ki-breadcrumb-item>
</ki-breadcrumb>
```

In this example the overflow has three levels. The trail shows Workspace,
the overflow button, Releases, and v2.4.0.

## Render a guarded breadcrumb

Put breadcrumb items in the default slot and supply plain-text item labels.
The surface's URL policy applies to each destination. Native links have no
custom action binding.

```json
{
  "version": 1,
  "root": {
    "component": "ki-breadcrumb",
    "props": { "label": "Project path" },
    "slots": {
      "": [
        {
          "component": "ki-breadcrumb-item",
          "props": { "href": "/workspace" },
          "slots": { "": ["Workspace"] }
        },
        {
          "component": "ki-breadcrumb-item",
          "props": { "current": true },
          "slots": { "": ["Settings"] }
        }
      ]
    }
  }
}
```
