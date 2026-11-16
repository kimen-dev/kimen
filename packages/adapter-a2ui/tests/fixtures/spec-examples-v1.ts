/**
 * Fixtures copied verbatim from the A2UI specification repository
 * (github.com/google/A2UI, commit 57f961f143da23f4212313e432a64b5843d978f9),
 * licensed Apache-2.0 (Copyright Google LLC; see the LICENSE file of that
 * repository). Kimen is also Apache-2.0. Each export names its source path.
 * They are A2UI 1.0 protocol data, not Kimen behavior: the tests replay them
 * through the adapter unchanged.
 */

// Source: catalogs/basic/v1/examples/scaffold-interactive-button.json
export const interactiveButtonV1 = [
  {
    version: '1.0',
    createSurface: {
      surfaceId: 'gallery-interactive-button',
      catalogId: 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json',
    },
  },
  {
    version: '1.0',
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

// Source: catalogs/basic/v1/examples/scaffold-simple-login-form.json
export const simpleLoginFormV1 = [
  {
    version: '1.0',
    createSurface: {
      surfaceId: 'gallery-simple-login-form',
      catalogId: 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json',
      sendDataModel: true,
    },
  },
  {
    version: '1.0',
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
          text: '## Login',
        },
        {
          id: 'username_field',
          component: 'TextField',
          label: 'Username',
          value: {
            '@path': '/username',
          },
          variant: 'shortText',
        },
        {
          id: 'password_field',
          component: 'TextField',
          label: 'Password',
          value: {
            '@path': '/password',
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
                  '@path': '/username',
                },
                pass: {
                  '@path': '/password',
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

// Source: catalogs/basic/v1/examples/child-list-template.json
export const childListTemplateV1 = [
  {
    version: '1.0',
    createSurface: {
      surfaceId: 'gallery-child-list-template',
      catalogId: 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json',
      sendDataModel: true,
    },
  },
  {
    version: '1.0',
    updateComponents: {
      surfaceId: 'gallery-child-list-template',
      components: [
        {
          id: 'root',
          component: 'Card',
          child: 'main_column',
        },
        {
          id: 'main_column',
          component: 'Column',
          children: ['title_text', 'item_list'],
          align: 'stretch',
        },
        {
          id: 'title_text',
          component: 'Text',
          text: '### Dynamic Item List',
        },
        {
          id: 'item_list',
          component: 'List',
          children: {
            componentId: 'item_row',
            path: '/items',
          },
        },
        {
          id: 'item_row',
          component: 'Row',
          children: ['item_name', 'qty_label', 'item_qty'],
        },
        {
          id: 'item_name',
          component: 'Text',
          text: {
            '@path': 'name',
          },
        },
        {
          id: 'qty_label',
          component: 'Text',
          text: ' - Qty: ',
        },
        {
          id: 'item_qty',
          component: 'Text',
          text: {
            '@path': 'quantity',
          },
        },
      ],
    },
  },
  {
    version: '1.0',
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

// Source: catalogs/basic/v1/examples/scaffold-incremental.json
export const incrementalV1 = [
  {
    version: '1.0',
    createSurface: {
      surfaceId: 'gallery-incremental',
      catalogId: 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json',
    },
  },
  {
    version: '1.0',
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
    version: '1.0',
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
    version: '1.0',
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
            '@path': 'title',
          },
        },
        {
          id: 'rc_subtitle',
          component: 'Text',
          text: {
            '@path': 'subtitle',
          },
        },
        {
          id: 'rc_address',
          component: 'Text',
          text: {
            '@path': 'address',
          },
        },
      ],
    },
  },
  {
    version: '1.0',
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
    version: '1.0',
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
                  '@path': 'title',
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

// Source: specification/v1_0/test/cases/contact_form_example.jsonl
export const contactFormV1 = [
  {
    version: '1.0',
    createSurface: {
      surfaceId: 'contact_form_1',
      catalogId: 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json',
    },
  },
  {
    version: '1.0',
    updateComponents: {
      surfaceId: 'contact_form_1',
      components: [
        {
          id: 'root',
          component: 'Card',
          child: 'form_container',
        },
        {
          id: 'form_container',
          component: 'Column',
          children: [
            'header_row',
            'name_row',
            'email_group',
            'phone_group',
            'pref_group',
            'divider_1',
            'newsletter_checkbox',
            'submit_button',
          ],
          justify: 'start',
          align: 'stretch',
        },
        {
          id: 'header_row',
          component: 'Row',
          children: ['header_icon', 'header_text'],
          align: 'center',
        },
        {
          id: 'header_icon',
          component: 'Icon',
          name: 'mail',
        },
        {
          id: 'header_text',
          component: 'Text',
          text: '# Contact Us',
        },
        {
          id: 'name_row',
          component: 'Row',
          children: ['first_name_group', 'last_name_group'],
          justify: 'spaceBetween',
        },
        {
          id: 'first_name_group',
          component: 'Column',
          children: ['first_name_label', 'first_name_field'],
          weight: 1,
        },
        {
          id: 'first_name_label',
          component: 'Text',
          text: 'First Name',
          variant: 'caption',
        },
        {
          id: 'first_name_field',
          component: 'TextField',
          label: 'First Name',
          value: {
            '@path': '/contact/firstName',
          },
          variant: 'shortText',
        },
        {
          id: 'last_name_group',
          component: 'Column',
          children: ['last_name_label', 'last_name_field'],
          weight: 1,
        },
        {
          id: 'last_name_label',
          component: 'Text',
          text: 'Last Name',
          variant: 'caption',
        },
        {
          id: 'last_name_field',
          component: 'TextField',
          label: 'Last Name',
          value: {
            '@path': '/contact/lastName',
          },
          variant: 'shortText',
        },
        {
          id: 'email_group',
          component: 'Column',
          children: ['email_label', 'email_field'],
        },
        {
          id: 'email_label',
          component: 'Text',
          text: 'Email Address',
          variant: 'caption',
        },
        {
          id: 'email_field',
          component: 'TextField',
          label: 'Email',
          value: {
            '@path': '/contact/email',
          },
          variant: 'shortText',
          '@checks': [
            {
              condition: {
                '@call': 'required',
                args: {
                  value: {
                    '@path': '/contact/email',
                  },
                },
              },
              message: 'Email is required.',
            },
            {
              condition: {
                '@call': 'email',
                args: {
                  value: {
                    '@path': '/contact/email',
                  },
                },
              },
              message: 'Please enter a valid email address.',
            },
          ],
        },
        {
          id: 'phone_group',
          component: 'Column',
          children: ['phone_label', 'phone_field'],
        },
        {
          id: 'phone_label',
          component: 'Text',
          text: 'Phone Number',
          variant: 'caption',
        },
        {
          id: 'phone_field',
          component: 'TextField',
          label: 'Phone',
          value: {
            '@path': '/contact/phone',
          },
          variant: 'shortText',
          '@checks': [
            {
              condition: {
                '@call': 'regex',
                args: {
                  value: {
                    '@path': '/contact/phone',
                  },
                  pattern: '^\\d{10}$',
                },
              },
              message: 'Phone number must be 10 digits.',
            },
          ],
        },
        {
          id: 'pref_group',
          component: 'Column',
          children: ['pref_label', 'pref_picker'],
        },
        {
          id: 'pref_label',
          component: 'Text',
          text: 'Preferred Contact Method',
          variant: 'caption',
        },
        {
          id: 'pref_picker',
          component: 'ChoicePicker',
          variant: 'mutuallyExclusive',
          options: [
            {
              label: 'Email',
              value: 'email',
            },
            {
              label: 'Phone',
              value: 'phone',
            },
            {
              label: 'SMS',
              value: 'sms',
            },
          ],
          value: {
            '@path': '/contact/preference',
          },
        },
        {
          id: 'divider_1',
          component: 'Divider',
          axis: 'horizontal',
        },
        {
          id: 'newsletter_checkbox',
          component: 'CheckBox',
          label: 'Subscribe to our newsletter',
          value: {
            '@path': '/contact/subscribe',
          },
        },
        {
          id: 'submit_button_label',
          component: 'Text',
          text: 'Send Message',
        },
        {
          id: 'submit_button',
          component: 'Button',
          child: 'submit_button_label',
          variant: 'primary',
          action: {
            event: {
              name: 'submitContactForm',
              context: {
                formId: 'contact_form_1',
                clientTime: {
                  '@call': 'formatDate',
                  args: {
                    value: '2026-02-02T15:17:00Z',
                    format: 'E MMM d, YYYY h:mm a',
                  },
                },
                isNewsletterSubscribed: {
                  '@path': '/contact/subscribe',
                },
              },
            },
          },
        },
      ],
    },
  },
  {
    version: '1.0',
    updateDataModel: {
      surfaceId: 'contact_form_1',
      path: '/contact',
      value: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '1234567890',
        preference: ['email'],
        subscribe: true,
      },
    },
  },
  {
    version: '1.0',
    deleteSurface: {
      surfaceId: 'contact_form_1',
    },
  },
] as const;

// Source: specification/v1_0/test/cases/renderer_messages.json (valid action and error entries)
export const validRendererMessagesV1 = [
  {
    version: '1.0',
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
    version: '1.0',
    action: {
      name: 'submit',
      userMessage: 'Submitted form',
      surfaceId: 'main',
      sourceComponentId: 'btn_submit',
      timestamp: '2023-10-27T10:00:00Z',
      context: {
        foo: 'bar',
      },
    },
  },
  {
    version: '1.0',
    error: {
      code: 'VALIDATION_FAILED',
      surfaceId: 'main',
      path: '/components/0/text',
      message: 'Invalid type',
    },
  },
  {
    version: '1.0',
    error: {
      code: 'UNALLOWED_PARENT',
      surfaceId: 'main',
      path: '/components/1',
      message: "Component 'TextField' is not allowed as a child of 'Surface'.",
    },
  },
  {
    version: '1.0',
    error: {
      code: 'UNALLOWED_CHILD',
      surfaceId: 'main',
      path: '/components/0/children/0',
      message: "Component 'Modal' is not allowed inside 'Column'.",
    },
  },
  {
    version: '1.0',
    error: {
      code: 'FUNCTION_FAILED',
      functionCallId: 'unique-call-id-132',
      message: 'Something went wrong',
    },
  },
  {
    version: '1.0',
    action: {
      name: 'submit',
      surfaceId: 'main',
      sourceComponentId: 'btn_submit',
      timestamp: '2023-10-27T10:00:00Z',
      context: {
        foo: 'bar',
      },
      metadata: {
        extensions: {
          client_audit: {
            signature: 'abc123token',
          },
        },
      },
    },
  },
] as const;
