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
