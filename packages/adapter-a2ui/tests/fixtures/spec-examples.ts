/**
 * Fixtures copied verbatim from the A2UI specification repository
 * (github.com/google/A2UI, commit 85120b91e2fe94cb20c8ddef0b545d3da2ae161f),
 * licensed Apache-2.0 (Copyright Google LLC; see the LICENSE file of that
 * repository). Kimen is also Apache-2.0. Each export names its source path
 * under `specification/v0_9_1/`. They are protocol data, not Kimen behavior:
 * the tests replay them through the adapter unchanged.
 */

// Source: specification/v0_9_1/catalogs/basic/examples/00_interactive-button.json
export const interactiveButton = [
  {
    version: 'v0.9',
    createSurface: {
      surfaceId: 'gallery-interactive-button',
      catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
    },
  },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'gallery-interactive-button',
      components: [
        {
          id: 'root',
          component: 'Column',
          children: ['title', 'action_button'],
          justify: 'center',
          align: 'center',
        },
        {
          id: 'title',
          component: 'Text',
          text: 'Click the button below',
          variant: 'body',
        },
        {
          id: 'action_button',
          component: 'Button',
          child: 'button_label',
          variant: 'primary',
          action: {
            event: {
              name: 'button_clicked',
              context: {},
            },
          },
        },
        {
          id: 'button_label',
          component: 'Text',
          text: 'Click Me',
        },
      ],
    },
  },
] as const;

// Source: specification/v0_9_1/catalogs/basic/examples/00_simple-login-form.json
export const simpleLoginForm = [
  {
    version: 'v0.9',
    createSurface: {
      surfaceId: 'gallery-simple-login-form',
      catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
      sendDataModel: true,
    },
  },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'gallery-simple-login-form',
      components: [
        {
          id: 'root',
          component: 'Column',
          children: ['form_title', 'username_field', 'password_field', 'submit_button'],
          justify: 'start',
          align: 'stretch',
        },
        {
          id: 'form_title',
          component: 'Text',
          text: 'Login',
          variant: 'h2',
        },
        {
          id: 'username_field',
          component: 'TextField',
          label: 'Username',
          value: {
            path: '/username',
          },
          variant: 'shortText',
        },
        {
          id: 'password_field',
          component: 'TextField',
          label: 'Password',
          value: {
            path: '/password',
          },
          variant: 'obscured',
        },
        {
          id: 'submit_button',
          component: 'Button',
          child: 'submit_label',
          variant: 'primary',
          action: {
            event: {
              name: 'login_submitted',
              context: {
                user: {
                  path: '/username',
                },
                pass: {
                  path: '/password',
                },
              },
            },
          },
        },
        {
          id: 'submit_label',
          component: 'Text',
          text: 'Sign In',
        },
      ],
    },
  },
] as const;

// Source: specification/v0_9_1/catalogs/basic/examples/34_child-list-template.json
export const childListTemplate = [
  {
    version: 'v0.9',
    createSurface: {
      surfaceId: 'gallery-child-list-template',
      catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
      sendDataModel: true,
    },
  },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'gallery-child-list-template',
      components: [
        {
          id: 'root',
          component: 'Card',
          child: 'main-column',
        },
        {
          id: 'main-column',
          component: 'Column',
          children: ['title-text', 'item-list'],
          align: 'stretch',
        },
        {
          id: 'title-text',
          component: 'Text',
          text: 'Dynamic Item List',
          variant: 'h3',
        },
        {
          id: 'item-list',
          component: 'List',
          children: {
            componentId: 'item-row',
            path: '/items',
          },
        },
        {
          id: 'item-row',
          component: 'Row',
          children: ['item-name', 'qty-label', 'item-qty'],
        },
        {
          id: 'item-name',
          component: 'Text',
          text: {
            path: 'name',
          },
        },
        {
          id: 'qty-label',
          component: 'Text',
          text: ' - Qty: ',
        },
        {
          id: 'item-qty',
          component: 'Text',
          text: {
            path: 'quantity',
          },
        },
      ],
    },
  },
  {
    version: 'v0.9',
    updateDataModel: {
      surfaceId: 'gallery-child-list-template',
      value: {
        items: [
          {
            name: 'Apple',
            quantity: 10,
          },
          {
            name: 'Banana',
            quantity: 5,
          },
          {
            name: 'Cherry',
            quantity: 20,
          },
        ],
      },
    },
  },
] as const;

// Source: specification/v0_9_1/catalogs/basic/examples/00_incremental.json
export const incremental = [
  {
    version: 'v0.9',
    createSurface: {
      surfaceId: 'gallery-incremental',
      catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
    },
  },
  {
    version: 'v0.9',
    updateDataModel: {
      surfaceId: 'gallery-incremental',
      path: '/',
      value: {
        restaurants: [
          {
            title: 'The Golden Fork',
            subtitle: 'Fine Dining & Spirits',
            address: '123 Gastronomy Lane',
          },
          {
            title: "Ocean's Bounty",
            subtitle: 'Fresh Daily Seafood',
            address: '456 Shoreline Dr',
          },
          {
            title: 'Pizzeria Roma',
            subtitle: 'Authentic Wood-Fired Pizza',
            address: '789 Napoli Way',
          },
        ],
      },
    },
  },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'gallery-incremental',
      components: [
        {
          id: 'root',
          component: 'Column',
          children: {
            path: '/restaurants',
            componentId: 'restaurant_card',
          },
        },
      ],
    },
  },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'gallery-incremental',
      components: [
        {
          id: 'restaurant_card',
          component: 'Column',
          children: ['rc_title', 'rc_subtitle', 'rc_address'],
        },
        {
          id: 'rc_title',
          component: 'Text',
          text: {
            path: 'title',
          },
        },
        {
          id: 'rc_subtitle',
          component: 'Text',
          text: {
            path: 'subtitle',
          },
        },
        {
          id: 'rc_address',
          component: 'Text',
          text: {
            path: 'address',
          },
        },
      ],
    },
  },
  {
    version: 'v0.9',
    updateDataModel: {
      surfaceId: 'gallery-incremental',
      path: '/restaurants/3',
      value: {
        title: 'Spice Route',
        subtitle: 'Exotic Flavors from the East',
        address: '101 Silk Road St',
      },
    },
  },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'gallery-incremental',
      components: [
        {
          id: 'restaurant_card',
          component: 'Column',
          children: ['rc_title', 'rc_subtitle', 'rc_address', 'rc_button'],
        },
        {
          id: 'rc_button',
          component: 'Button',
          child: 'rc_button_label',
          action: {
            event: {
              name: 'book_now',
              context: {
                restaurantName: {
                  path: 'title',
                },
              },
            },
          },
        },
        {
          id: 'rc_button_label',
          component: 'Text',
          text: 'Book now',
        },
      ],
    },
  },
] as const;

// Source: specification/v0_9_1/test/cases/client_messages.json (valid entries)
export const validClientMessages = [
  {
    version: 'v0.9',
    action: {
      name: 'submit',
      surfaceId: 'main',
      sourceComponentId: 'btn_submit',
      timestamp: '2023-10-27T10:00:00Z',
      context: {
        foo: 'bar',
      },
    },
  },
  {
    version: 'v0.9',
    error: {
      code: 'VALIDATION_FAILED',
      surfaceId: 'main',
      path: '/components/0/text',
      message: 'Invalid type',
    },
  },
] as const;
