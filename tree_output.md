.
├── INSTALLATION.md
├── LICENSE.md
├── README.md
├── docs
│   ├── index.md
│   └── info
│       ├── env.md
│       ├── scripts.md
│       ├── seed-data.md
│       ├── src.md
│       └── wait-for.sh.md
├── env
├── jest.config.js
├── nest-cli.json
├── package-lock.json
├── package.json
├── scripts
│   ├── setup-influxdb
│   │   ├── args.sh
│   │   ├── functions.sh
│   │   └── run.sh
│   ├── setup-mongo-replica
│   │   ├── args.sh
│   │   ├── functions.sh
│   │   └── run.sh
│   ├── setup-redis
│   │   ├── args.sh
│   │   ├── functions.sh
│   │   └── run.sh
│   └── shared-functions.sh
├── seed-data
│   └── users.json
├── src
│   ├── config
│   │   ├── index.ts
│   │   └── resources
│   │       ├── db-conn.ts
│   │       ├── process-map.ts
│   │       └── server.ts
│   ├── interceptors
│   │   ├── auth.interceptor.ts
│   │   └── response.interceptor.ts
│   ├── main.ts
│   ├── middlewares
│   │   ├── auth.middleware.ts
│   │   └── trace.middleware.ts
│   ├── modules
│   │   ├── App
│   │   │   ├── app.controller.spec.ts
│   │   │   ├── app.controller.ts
│   │   │   ├── app.module.ts
│   │   │   └── app.service.ts
│   │   ├── auth
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── graphql
│   │   │   └── types.ts
│   │   ├── client
│   │   │   ├── client.controller.ts
│   │   │   ├── client.module.ts
│   │   │   ├── client.service.ts
│   │   │   ├── client.service.utils.mongo-syntax.ts
│   │   │   ├── decorators
│   │   │   │   ├── init-logs.ts
│   │   │   │   ├── perf-time.ts
│   │   │   │   └── preOperate.ts
│   │   │   ├── dto
│   │   │   │   ├── base-record-space-slug.dto.ts
│   │   │   │   ├── function.dto.ts
│   │   │   │   ├── general.dto.ts
│   │   │   │   ├── search-record.dto.ts
│   │   │   │   └── update-record.dto.ts
│   │   │   ├── type.ts
│   │   │   └── utils
│   │   │       ├── convert-plain-obj-to-comparative-array.spec.ts
│   │   │       ├── convert-plain-obj-to-comparative-array.ts
│   │   │       ├── delete-empty-array-nodes.spec.ts
│   │   │       ├── delete-empty-array-nodes.ts
│   │   │       ├── gen.ts
│   │   │       ├── get-existing-keys-with-type.ts
│   │   │       ├── get-query-field-details.ts
│   │   │       ├── index.ts
│   │   │       ├── post-operate-record-dump.ts
│   │   │       ├── post-operate-record.ts
│   │   │       ├── validate-fields.ts
│   │   │       └── validateInBulk.ts
│   │   ├── client-functions
│   │   │   ├── client-functions.module.ts
│   │   │   ├── client-functions.service.ts
│   │   │   ├── resources
│   │   │   │   ├── email
│   │   │   │   │   ├── service.ts
│   │   │   │   │   └── templates
│   │   │   │   │       ├── confirm-account
│   │   │   │   │       │   ├── docs.json
│   │   │   │   │       │   ├── index.html
│   │   │   │   │       │   └── index.txt
│   │   │   │   │       ├── confirm-account-by-short-code
│   │   │   │   │       │   ├── docs.json
│   │   │   │   │       │   ├── index.html
│   │   │   │   │       │   └── index.txt
│   │   │   │   │       ├── error-notification
│   │   │   │   │       │   ├── docs.json
│   │   │   │   │       │   ├── index.html
│   │   │   │   │       │   └── index.txt
│   │   │   │   │       ├── forgot-password
│   │   │   │   │       │   ├── docs.json
│   │   │   │   │       │   ├── index.html
│   │   │   │   │       │   └── index.txt
│   │   │   │   │       └── generic-email
│   │   │   │   │           ├── docs.json
│   │   │   │   │           ├── index.html
│   │   │   │   │           └── index.txt
│   │   │   │   ├── index.ts
│   │   │   │   ├── login
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── metadata.ts
│   │   │   │   ├── send-otp
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── metadata.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── utils
│   │   │   │       ├── email
│   │   │   │       │   ├── index.ts
│   │   │   │       │   ├── service.ts
│   │   │   │       │   ├── templates
│   │   │   │       │   │   ├── confirm-account
│   │   │   │       │   │   │   ├── docs.json
│   │   │   │       │   │   │   ├── index.html
│   │   │   │       │   │   │   └── index.txt
│   │   │   │       │   │   ├── confirm-account-by-short-code
│   │   │   │       │   │   │   ├── docs.json
│   │   │   │       │   │   │   ├── index.html
│   │   │   │       │   │   │   └── index.txt
│   │   │   │       │   │   ├── error-notification
│   │   │   │       │   │   │   ├── docs.json
│   │   │   │       │   │   │   ├── index.html
│   │   │   │       │   │   │   └── index.txt
│   │   │   │       │   │   ├── forgot-password
│   │   │   │       │   │   │   ├── docs.json
│   │   │   │       │   │   │   ├── index.html
│   │   │   │       │   │   │   └── index.txt
│   │   │   │       │   │   ├── generic-email
│   │   │   │       │   │   │   ├── docs.json
│   │   │   │       │   │   │   ├── index.html
│   │   │   │       │   │   │   └── index.txt
│   │   │   │       │   │   └── otp
│   │   │   │       │   │       ├── docs.json
│   │   │   │       │   │       ├── index.html
│   │   │   │       │   │       └── index.txt
│   │   │   │       │   └── types.ts
│   │   │   │       └── index.ts
│   │   │   └── utils.ts
│   │   ├── gateway
│   │   │   ├── gateway.controller.ts
│   │   │   ├── gateway.module.ts
│   │   │   └── gateway.service.ts
│   │   ├── logger
│   │   │   ├── constants.ts
│   │   │   ├── logger.module.ts
│   │   │   ├── logger.service.ts
│   │   │   ├── type.ts
│   │   │   └── utils
│   │   │       ├── parse-time.ts
│   │   │       ├── read-file.ts
│   │   │       ├── wrapped-log.ts
│   │   │       └── write-file.ts
│   │   ├── projects
│   │   │   ├── dto
│   │   │   │   ├── create-project.input.ts
│   │   │   │   ├── project-filter.input.ts
│   │   │   │   ├── slug.input.ts
│   │   │   │   └── update-project.input.ts
│   │   │   ├── entities
│   │   │   │   └── project.entity.ts
│   │   │   ├── projects.module.ts
│   │   │   └── projects.service.ts
│   │   ├── record-spaces
│   │   │   ├── dto
│   │   │   │   ├── action-scope.enum.ts
│   │   │   │   ├── auth-options-scope.ts
│   │   │   │   ├── create-fields.input.ts
│   │   │   │   ├── create-record-space.input.ts
│   │   │   │   ├── general.dto.ts
│   │   │   │   ├── https-methods.enum.ts
│   │   │   │   ├── record-space-filter.input.ts
│   │   │   │   └── update-record-space.input.ts
│   │   │   ├── record-spaces.module.ts
│   │   │   ├── record-spaces.service.ts
│   │   │   └── types.ts
│   │   ├── records
│   │   │   ├── dto
│   │   │   │   ├── create-record.input.ts
│   │   │   │   ├── get-records.input.ts
│   │   │   │   └── update-record.input.ts
│   │   │   ├── records.module.ts
│   │   │   ├── records.service.ts
│   │   │   └── types.ts
│   │   └── user
│   │       ├── dto
│   │       │   ├── confirmAccount.dto.ts
│   │       │   ├── createUser.dto.ts
│   │       │   ├── createUserResponse.dto.ts
│   │       │   ├── editUserResponse.dto.ts
│   │       │   ├── forgotPassword.dto.ts
│   │       │   ├── gen.dto.ts
│   │       │   ├── getUser.dto.ts
│   │       │   ├── getUserDetails.dto.ts
│   │       │   ├── index.ts
│   │       │   ├── newPassword.dto.ts
│   │       │   ├── resendShortCode.dto.ts
│   │       │   ├── successResponseDto.ts
│   │       │   ├── updateUser.dto.ts
│   │       │   ├── userExists.dto.ts
│   │       │   └── userExistsResponse.dto.ts
│   │       ├── types.ts
│   │       ├── user.module.ts
│   │       └── user.service.ts
│   ├── schemas
│   │   ├── base-model.schema.ts
│   │   ├── index.ts
│   │   ├── project-keys.schema.ts
│   │   ├── projects.schema.ts
│   │   ├── record-dump.schema.ts
│   │   ├── record-field.schema.ts
│   │   ├── record-space.schema.ts
│   │   ├── record.schema.ts
│   │   ├── types.ts
│   │   ├── user.schema.ts
│   │   └── utils.ts
│   ├── types
│   │   ├── global.d.ts
│   │   └── index.ts
│   └── utils
│       ├── client-function-body-payload-check.ts
│       ├── console-colors.ts
│       ├── context-getter.ts
│       ├── convertTruthyStringsToBooleans.ts
│       ├── create-regex-search-object.ts
│       ├── create-uuid.ts
│       ├── custom-class-validators.ts
│       ├── date-formats.ts
│       ├── dtoStringToNumber.ts
│       ├── exceptions.ts
│       ├── firebase-admin.ts
│       ├── firstLetterCapitalize.ts
│       ├── gen.ts
│       ├── generate-curl-command.ts
│       ├── get-record-structure-hash.ts
│       ├── getCorsOptionsDelegate.ts
│       ├── github-oauth-link.ts
│       ├── globalVar.ts
│       ├── google-oauth-link.ts
│       ├── hash
│       │   ├── argon.ts
│       │   └── index.ts
│       ├── index.ts
│       ├── jwt.ts
│       ├── measure-performance.ts
│       ├── mongo
│       │   ├── create-collection-instance.ts
│       │   ├── create-collection.ts
│       │   ├── index.ts
│       │   └── mongo-connection.ts
│       ├── objectCheck.ts
│       ├── phone-number-is-accepted.ts
│       ├── query-without-hashed-fields.ts
│       ├── randomCardCode.ts
│       ├── randomString.ts
│       ├── readStreamPromise.ts
│       ├── redis
│       │   ├── connection.ts
│       │   ├── index.ts
│       │   └── utils.ts
│       ├── screenFields.ts
│       ├── set-env.ts
│       ├── sleep.ts
│       ├── stringInject.ts
│       ├── validateEmail.ts
│       └── validatePassword.ts
├── tree_output.md
├── tsconfig.build.json
├── tsconfig.json
└── wait-for.sh

60 directories, 226 files
