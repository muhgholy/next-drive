## [1.6.1](https://github.com/muhgholy/next-drive/compare/v1.6.0...v1.6.1) (2025-12-31)


### Bug Fixes

* **cors:** correctly reject requests from non-allowed origins ([56585ff](https://github.com/muhgholy/next-drive/commit/56585ff6c5a3739fc9a7c6877d09fe2edc4395ac))

# [1.6.0](https://github.com/muhgholy/next-drive/compare/v1.5.0...v1.6.0) (2025-12-31)


### Features

* **client:** add withCredentials support for cross-origin cookies ([80505b3](https://github.com/muhgholy/next-drive/commit/80505b35bd7f968aa3ec6e6ddd07018ada82127f))

# [1.5.0](https://github.com/muhgholy/next-drive/compare/v1.4.2...v1.5.0) (2025-12-31)


### Features

* add CORS configuration support for Express ([2476c95](https://github.com/muhgholy/next-drive/commit/2476c95cf625af36d0d4715276236c31d5a99658))

## [1.4.1](https://github.com/muhgholy/next-drive/compare/v1.4.0...v1.4.1) (2025-12-31)


### Bug Fixes

* enable code splitting to share globalConfig state across entry points ([2cab34d](https://github.com/muhgholy/next-drive/commit/2cab34d2a37e14febeb0b426c505bf08e221e400))

# [1.4.0](https://github.com/muhgholy/next-drive/compare/v1.3.0...v1.4.0) (2025-12-30)


### Bug Fixes

* resolve memory issue in DTS generation ([453e637](https://github.com/muhgholy/next-drive/commit/453e6376e0f5a3ecf725dceaadabfc700569f573))


### Features

* add Express adapter for server-side integration ([862dee8](https://github.com/muhgholy/next-drive/commit/862dee826b3aa3bdaa8cebcf27c56995c393433b))

# [1.3.0](https://github.com/muhgholy/next-drive/compare/v1.2.0...v1.3.0) (2025-12-28)


### Features

* add universal schema export path ([48aebd1](https://github.com/muhgholy/next-drive/commit/48aebd1fa3f999ca87095cc5f1dd913e86135497))

# [1.2.0](https://github.com/muhgholy/next-drive/compare/v1.1.6...v1.2.0) (2025-12-28)


### Features

* add image preview to file chooser component ([b69c7b3](https://github.com/muhgholy/next-drive/commit/b69c7b3d856910fe6da3f193ba6973ec0760a8e1))

## [1.1.6](https://github.com/muhgholy/next-drive/compare/v1.1.5...v1.1.6) (2025-12-28)


### Bug Fixes

* add ESLint configuration for TypeScript ([7cfaac2](https://github.com/muhgholy/next-drive/commit/7cfaac2e52947a4de9021f400df95661491f12bc))

## [1.1.5](https://github.com/muhgholy/next-drive/compare/v1.1.4...v1.1.5) (2025-12-28)


### Bug Fixes

* move sharp back to dependencies for better DX ([c54a775](https://github.com/muhgholy/next-drive/commit/c54a77533ed8bdf10461d2b638a5d422880fdd9a))

## [1.1.4](https://github.com/muhgholy/next-drive/compare/v1.1.3...v1.1.4) (2025-12-28)


### Bug Fixes

* add missing sharp import in local.ts provider ([313b6fe](https://github.com/muhgholy/next-drive/commit/313b6fe54cf96c26ca681abec2e8c272db1e3d34))

## [1.1.3](https://github.com/muhgholy/next-drive/compare/v1.1.2...v1.1.3) (2025-12-28)


### Bug Fixes

* resolve sharp dynamic require error and move to peerDependencies ([92b53b4](https://github.com/muhgholy/next-drive/commit/92b53b44e8efb7a4e807a28ea28bde2a69213cce))

## [1.1.2](https://github.com/muhgholy/next-drive/compare/v1.1.1...v1.1.2) (2025-12-28)


### Bug Fixes

* remove [@tailwind](https://github.com/tailwind) directives from styles.css ([aa8caf8](https://github.com/muhgholy/next-drive/commit/aa8caf857e4fb7fd59dec8c030c79f33afd7dc08))

## [1.1.1](https://github.com/muhgholy/next-drive/compare/v1.1.0...v1.1.1) (2025-12-28)


### Bug Fixes

* add Tailwind CSS configuration and fix upload bodyParser issue ([27c332c](https://github.com/muhgholy/next-drive/commit/27c332c3387b6772da51b778a41891dfdde363e4))

# [1.1.0](https://github.com/muhgholy/next-drive/compare/v1.0.2...v1.1.0) (2025-12-28)


### Features

* add client-side URL utilities and image quality types ([a793277](https://github.com/muhgholy/next-drive/commit/a7932776c07769c8e77824b79717908ac38644c8))

## [1.0.2](https://github.com/muhgholy/next-drive/compare/v1.0.1...v1.0.2) (2025-12-28)


### Bug Fixes

* move driveFileSchemaZod to client package to avoid bundling server modules ([33b4f75](https://github.com/muhgholy/next-drive/commit/33b4f75f762ea8b160f1d607fb5cc0d8ea0ee75f))

## [1.0.1](https://github.com/muhgholy/next-drive/compare/v1.0.0...v1.0.1) (2025-12-28)


### Bug Fixes

* remove NPM_TOKEN for trusted publisher authentication ([ce20a91](https://github.com/muhgholy/next-drive/commit/ce20a919ccfde43c9f3f034bbdb1258dc289d3b6))

# 1.0.0 (2025-12-28)


### Features

* remove preview and file details components, export driveFileSchemaZod ([9aa7f11](https://github.com/muhgholy/next-drive/commit/9aa7f11052d6f031c69563f76d9ac5cec1140cce))


### BREAKING CHANGES

* Removed DriveFilePreview and DriveFileDetails components. Applications using these components will need to implement their own preview/details UI.

- Remove preview functionality and react-pdf dependency
- Remove file details sheet component
- Export driveFileSchemaZod for form validation
- Update README with Pages Router API example and Zod validation usage
