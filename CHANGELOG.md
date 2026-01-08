# [3.11.0](https://github.com/muhgholy/next-drive/compare/v3.10.0...v3.11.0) (2026-01-08)


### Features

* add backpressure handling for chunked file uploads ([8b8ff76](https://github.com/muhgholy/next-drive/commit/8b8ff766603a74f45ceea3eb26b49a12e4d93bba))

# [3.10.0](https://github.com/muhgholy/next-drive/compare/v3.9.0...v3.10.0) (2026-01-08)


### Features

* add ROOT mode for admin access without authentication ([afe73f0](https://github.com/muhgholy/next-drive/commit/afe73f03ad2f6674844053a4db6dacb0b84aaac4))

# [3.9.0](https://github.com/muhgholy/next-drive/compare/v3.8.0...v3.9.0) (2026-01-08)


### Bug Fixes

* resolve TypeScript error in StorageAccount creation ([4802efc](https://github.com/muhgholy/next-drive/commit/4802efce04cda3884aa0683616424fb20c234fd4))


### Features

* update documentation and finalize v3.7.0 release ([a39a5ca](https://github.com/muhgholy/next-drive/commit/a39a5ca8ba5000d2535c33974c6447d98327aa0b))

# [3.8.0](https://github.com/muhgholy/next-drive/compare/v3.7.1...v3.8.0) (2026-01-08)


### Features

* release v3.7.0 with serve authentication fix and enhancements ([41a0c4c](https://github.com/muhgholy/next-drive/commit/41a0c4cdab3f2fdc755e285573ab6d85c1db23f8))

## [3.7.1](https://github.com/muhgholy/next-drive/compare/v3.7.0...v3.7.1) (2026-01-08)


### Bug Fixes

* move serve and thumbnail endpoints before authentication ([b0bbc87](https://github.com/muhgholy/next-drive/commit/b0bbc8733569ce2d8f9634f808116a000565f260))

# [3.7.0](https://github.com/muhgholy/next-drive/compare/v3.6.0...v3.7.0) (2026-01-08)


### Features

* add mime option to driveUpload for custom MIME type specification ([9ac7adb](https://github.com/muhgholy/next-drive/commit/9ac7adb0f9158ed70d97cff44c41f8bead5e51b8))

# [3.6.0](https://github.com/muhgholy/next-drive/compare/v3.5.0...v3.6.0) (2026-01-08)


### Features

* add CommonJS support for tsx and ts-node compatibility ([5916d57](https://github.com/muhgholy/next-drive/commit/5916d5798a4010b2e2d7884c1c9718ee2fd7a239))

# [3.5.0](https://github.com/muhgholy/next-drive/compare/v3.4.0...v3.5.0) (2026-01-08)


### Features

* add driveInfo function for detailed file/folder information ([31dcae4](https://github.com/muhgholy/next-drive/commit/31dcae47fb0f9685724b57e6f7c57e49351cd9f8))

# [3.4.0](https://github.com/muhgholy/next-drive/compare/v3.3.0...v3.4.0) (2026-01-08)


### Features

* publish v3.3.0 with all recent improvements ([04328bd](https://github.com/muhgholy/next-drive/commit/04328bdd7ac5f93ae367e971cae29750d9861eab))

# [3.3.0](https://github.com/muhgholy/next-drive/compare/v3.2.3...v3.3.0) (2026-01-08)


### Features

* add Buffer support to driveUpload function ([917ece9](https://github.com/muhgholy/next-drive/commit/917ece9defd8cd301be7ca392088980bbbaad73a))

## [3.2.3](https://github.com/muhgholy/next-drive/compare/v3.2.2...v3.2.3) (2026-01-08)


### Bug Fixes

* force semantic release publish ([5269923](https://github.com/muhgholy/next-drive/commit/5269923f57e228720b0b782cdbc001bc28706c89))

## [3.2.2](https://github.com/muhgholy/next-drive/compare/v3.2.1...v3.2.2) (2026-01-08)


### Bug Fixes

* trigger release for upload logging and UI improvements ([f4353db](https://github.com/muhgholy/next-drive/commit/f4353dba9a2a255cb97da58d031ceaf8dd0eea00))

## [3.2.1](https://github.com/muhgholy/next-drive/compare/v3.2.0...v3.2.1) (2026-01-07)


### Bug Fixes

* prevent auto-close of manually opened upload dialog and fix double slash in URLs ([af21ef1](https://github.com/muhgholy/next-drive/commit/af21ef1c9b5018c474d06ac3b0402667e249e838))

# [3.2.0](https://github.com/muhgholy/next-drive/compare/v3.1.0...v3.2.0) (2026-01-07)


### Features

* add Copy and Download buttons to log viewer ([c53cb8b](https://github.com/muhgholy/next-drive/commit/c53cb8bb728bd67d1cd2d5073b6d3976d41361e4))

# [3.1.0](https://github.com/muhgholy/next-drive/compare/v3.0.0...v3.1.0) (2026-01-07)


### Features

* add comprehensive upload logging with debug viewer ([542a7de](https://github.com/muhgholy/next-drive/commit/542a7de8557438af8674a55567be5dce404c7786))

# [3.0.0](https://github.com/muhgholy/next-drive/compare/v2.2.5...v3.0.0) (2026-01-07)


### Bug Fixes

* correct quota calculation to filter by provider and account ([8f91e7d](https://github.com/muhgholy/next-drive/commit/8f91e7d7e6fd9ee37fa2e6da7db86cc204822d4d))
* resolve EXDEV cross-device rename error and path duplication ([accfcc1](https://github.com/muhgholy/next-drive/commit/accfcc15982963d03f2768121f00be8b7e9abbfc))


### Features

* add driveUpload server function for programmatic file uploads ([874531c](https://github.com/muhgholy/next-drive/commit/874531c963a6bdf3a836389d12de93949169e885))


### BREAKING CHANGES

* File storage path changed from {storage.path}/drive/{id}/data.ext to {storage.path}/{id}/data.ext

# [3.0.0](https://github.com/muhgholy/next-drive/compare/v2.2.5...v3.0.0) (2026-01-07)


### Bug Fixes

* correct quota calculation to filter by provider and account ([8f91e7d](https://github.com/muhgholy/next-drive/commit/8f91e7d7e6fd9ee37fa2e6da7db86cc204822d4d))
* resolve EXDEV cross-device rename error and path duplication ([accfcc1](https://github.com/muhgholy/next-drive/commit/accfcc15982963d03f2768121f00be8b7e9abbfc))


### Features

* add driveUpload server function for programmatic file uploads ([874531c](https://github.com/muhgholy/next-drive/commit/874531c963a6bdf3a836389d12de93949169e885))


### BREAKING CHANGES

* File storage path changed from {storage.path}/drive/{id}/data.ext to {storage.path}/{id}/data.ext

# [3.0.0](https://github.com/muhgholy/next-drive/compare/v2.2.5...v3.0.0) (2026-01-07)


### Bug Fixes

* correct quota calculation to filter by provider and account ([8f91e7d](https://github.com/muhgholy/next-drive/commit/8f91e7d7e6fd9ee37fa2e6da7db86cc204822d4d))
* resolve EXDEV cross-device rename error and path duplication ([accfcc1](https://github.com/muhgholy/next-drive/commit/accfcc15982963d03f2768121f00be8b7e9abbfc))


### Features

* add driveUpload server function for programmatic file uploads ([874531c](https://github.com/muhgholy/next-drive/commit/874531c963a6bdf3a836389d12de93949169e885))


### BREAKING CHANGES

* File storage path changed from {storage.path}/drive/{id}/data.ext to {storage.path}/{id}/data.ext

# [3.0.0](https://github.com/muhgholy/next-drive/compare/v2.2.5...v3.0.0) (2026-01-07)


### Bug Fixes

* resolve EXDEV cross-device rename error and path duplication ([accfcc1](https://github.com/muhgholy/next-drive/commit/accfcc15982963d03f2768121f00be8b7e9abbfc))


### Features

* add driveUpload server function for programmatic file uploads ([874531c](https://github.com/muhgholy/next-drive/commit/874531c963a6bdf3a836389d12de93949169e885))


### BREAKING CHANGES

* File storage path changed from {storage.path}/drive/{id}/data.ext to {storage.path}/{id}/data.ext

# [3.0.0](https://github.com/muhgholy/next-drive/compare/v2.2.5...v3.0.0) (2026-01-01)


### Bug Fixes

* resolve EXDEV cross-device rename error and path duplication ([accfcc1](https://github.com/muhgholy/next-drive/commit/accfcc15982963d03f2768121f00be8b7e9abbfc))


### BREAKING CHANGES

* File storage path changed from {storage.path}/drive/{id}/data.ext to {storage.path}/{id}/data.ext

## [2.2.5](https://github.com/muhgholy/next-drive/compare/v2.2.4...v2.2.5) (2026-01-01)


### Reverts

* Revert "fix: code style improvements and refactoring" ([29eb327](https://github.com/muhgholy/next-drive/commit/29eb3270d8f573b460f0114cb524fddf4f4e75b3))

## [2.2.4](https://github.com/muhgholy/next-drive/compare/v2.2.3...v2.2.4) (2026-01-01)


### Bug Fixes

* include README.md in npm package ([d16c5d9](https://github.com/muhgholy/next-drive/commit/d16c5d9c11c9ac577994ec43c519c20c4932ef7f))

## [2.2.3](https://github.com/muhgholy/next-drive/compare/v2.2.2...v2.2.3) (2026-01-01)


### Bug Fixes

* code style improvements and refactoring ([7eb848e](https://github.com/muhgholy/next-drive/commit/7eb848ef409b36fde019fcb2f7f23bd80e2362bd))

## [2.2.2](https://github.com/muhgholy/next-drive/compare/v2.2.1...v2.2.2) (2026-01-01)


### Bug Fixes

* **ui:** use CSS class for progress bar animation instead of Tailwind arbitrary value ([19c9a57](https://github.com/muhgholy/next-drive/commit/19c9a574eceda267ab7cb89e0d92f860abcc2039))

## [2.2.1](https://github.com/muhgholy/next-drive/compare/v2.2.0...v2.2.1) (2026-01-01)


### Bug Fixes

* preserve source file createdAt timestamp for Google Drive items during sync ([2508ecd](https://github.com/muhgholy/next-drive/commit/2508ecdf7659dbe7d3c89a7dba09ce123ec79d0b))

# [2.2.0](https://github.com/muhgholy/next-drive/compare/v2.1.0...v2.2.0) (2026-01-01)


### Features

* **ui:** improve mobile sidebar UX and upload dialog ([ae5271f](https://github.com/muhgholy/next-drive/commit/ae5271f45eca48ec9ff37cfcfebc6dc08802f163))

# [2.1.0](https://github.com/muhgholy/next-drive/compare/v2.0.2...v2.1.0) (2026-01-01)


### Features

* simplify context with optimistic updates and improve mobile UX ([dc0af2d](https://github.com/muhgholy/next-drive/commit/dc0af2ddd520e31a4b0f34fb730f8c2aa8b0d3d1))

## [2.0.2](https://github.com/muhgholy/next-drive/compare/v2.0.1...v2.0.2) (2025-12-31)


### Bug Fixes

* resolve JSON body parsing for createFolder API request ([54b67e7](https://github.com/muhgholy/next-drive/commit/54b67e7aa08fcb9f5ae7171b29d87e20d8d0b368))

## [2.0.1](https://github.com/muhgholy/next-drive/compare/v2.0.0...v2.0.1) (2025-12-31)


### Bug Fixes

* file name truncation in file chooser multiple selection ([08390e3](https://github.com/muhgholy/next-drive/commit/08390e3a43811c436f704a5b83e644f281e699f0))

# [2.0.0](https://github.com/muhgholy/next-drive/compare/v1.7.1...v2.0.0) (2025-12-31)


### Bug Fixes

* upload cancel validation and OAuth cross-tab communication ([4cb8dde](https://github.com/muhgholy/next-drive/commit/4cb8dde576f09b75fb32410dcd3c8abcbf90c589))


### BREAKING CHANGES

* None

## [1.6.4](https://github.com/muhgholy/next-drive/compare/v1.6.3...v1.6.4) (2025-12-31)


### Bug Fixes

* **security:** sanitize file extension to prevent path injection ([1cf7372](https://github.com/muhgholy/next-drive/commit/1cf7372b3896a4421d38146a95ca2ab06c2e1450))

## [1.6.3](https://github.com/muhgholy/next-drive/compare/v1.6.2...v1.6.3) (2025-12-31)


### Bug Fixes

* **upload:** preserve original file extension when saving to disk ([2102cd1](https://github.com/muhgholy/next-drive/commit/2102cd13695be10ab9ec330050096af50893d066))

## [1.6.2](https://github.com/muhgholy/next-drive/compare/v1.6.1...v1.6.2) (2025-12-31)


### Bug Fixes

* **quota:** use configured quotaInBytes without fallback ([5f1828e](https://github.com/muhgholy/next-drive/commit/5f1828e0fd678a0f8d8645a88e98987f365a5421))

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
