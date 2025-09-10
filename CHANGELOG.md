# Changelog

## [1.13.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.12.0...v1.13.0) (2025-09-10)


### Features

* **inspector:** upgrade to modern Navigation API for navigation prevention ([3121230](https://github.com/nguyenvanduocit/instantCode/commit/312123068f85589e84beec2016c96fcf2bed78f5))
* **inspector:** upgrade to modern Navigation API for navigation prevention ([2c4e1c9](https://github.com/nguyenvanduocit/instantCode/commit/2c4e1c9d4ce4aadc197fe4c0b6c60d820675248a))
* **inspector:** upgrade to modern Navigation API for navigation prevention ([6888458](https://github.com/nguyenvanduocit/instantCode/commit/68884586c3cc42447bdbe892bcd598f9a144cd3c))

## [1.12.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.11.0...v1.12.0) (2025-09-10)


### Features

* **build:** add TypeScript declaration file generation ([2d49d0e](https://github.com/nguyenvanduocit/instantCode/commit/2d49d0e58a6938dab604980d299720596fe87c98))
* **config:** add configurable listen and public addresses ([49d8a25](https://github.com/nguyenvanduocit/instantCode/commit/49d8a2533237494d29394268867243bddf52af4f))
* improve ([1b8c6b6](https://github.com/nguyenvanduocit/instantCode/commit/1b8c6b6006aee586f430c020aaaafab032a96798))
* **inspector:** add imagePaths parameter to buildHierarchicalStructure ([3798c5f](https://github.com/nguyenvanduocit/instantCode/commit/3798c5f7307b1b4b123d843e4e5b3e228a5f33cf))
* **inspector:** add mock mode support and enhance message display ([0450da5](https://github.com/nguyenvanduocit/instantCode/commit/0450da598254ebec9db810e6cf4aefd7a07a9cb9))
* **inspector:** add screenshot capture of selected elements ([7c5d8d9](https://github.com/nguyenvanduocit/instantCode/commit/7c5d8d90e1b015ba0a7e8461cc3ee0f8eddaedcd))
* **inspector:** enhance component detection with React support and source mapping ([7cf34f9](https://github.com/nguyenvanduocit/instantCode/commit/7cf34f9e75f9c2cfd01eac5ea4a0a71fddb520ca))
* **inspector:** improve processing state management and message handling ([5586f7b](https://github.com/nguyenvanduocit/instantCode/commit/5586f7ba03285c85fdbec118bd246d0c1a4f924a))
* **inspector:** improve screenshot filename format with element metadata ([baeceff](https://github.com/nguyenvanduocit/instantCode/commit/baeceff29ea535a449dc84a5e91c5c592d2adaa3))
* **inspector:** integrate imagePath field with client and server ([9f9e098](https://github.com/nguyenvanduocit/instantCode/commit/9f9e09826163d4489bec1e70af0a6bea125ec742))
* **inspector:** switch from PNG to JPEG for smaller file sizes ([39f8557](https://github.com/nguyenvanduocit/instantCode/commit/39f855777f50cb8a0a3d23ef0106dade89bf01ef))
* **inspector:** switch from PNG to WebP for element screenshots ([b63c9f9](https://github.com/nguyenvanduocit/instantCode/commit/b63c9f98064418b22448e6868318a247bbaf5260))
* **inspector:** switch from WebP to JPEG for element screenshots ([64999a1](https://github.com/nguyenvanduocit/instantCode/commit/64999a10b3f50a37fd77e322ba194b04ab4fa79c))
* **schemas:** add computed styles to ElementDataSchema ([e6bc7a9](https://github.com/nguyenvanduocit/instantCode/commit/e6bc7a908a2c4385b90175e7dcf276060f618237))
* **schemas:** add imagePath parameter to buildHierarchicalStructure ([93f38c9](https://github.com/nguyenvanduocit/instantCode/commit/93f38c9bea7c5da055e694fc88b1c925ae182c14))
* **schemas:** add imagePath to ElementDataSchema ([7c95f73](https://github.com/nguyenvanduocit/instantCode/commit/7c95f73cddf0582e1f2353a37b02653bff31a6d3))
* **server:** add configurable listen and public addresses ([6c13e3c](https://github.com/nguyenvanduocit/instantCode/commit/6c13e3c8d78613b0b94ab99a0b1f39091b85770b))
* **server:** add POST endpoint for base64 image upload ([e0baafd](https://github.com/nguyenvanduocit/instantCode/commit/e0baafd0ed69ad20bc1749ef0b5d741fedaad5f0))
* simplify CI/CD with release-please automation ([bd798c0](https://github.com/nguyenvanduocit/instantCode/commit/bd798c096f3e581ede1f48940a5a019c90dca5be))
* **vite:** add Vite plugin for seamless development integration ([b1d86fc](https://github.com/nguyenvanduocit/instantCode/commit/b1d86fcf88815a999adda5f87549726b4a254f63))
* **vite:** restrict plugin to development mode only ([c006dae](https://github.com/nguyenvanduocit/instantCode/commit/c006dae7969ece2e778a22f967b33a4c1ad3dff0))


### Bug Fixes

* **inspector:** exit inspect mode when closing card with toggle ([78d18b4](https://github.com/nguyenvanduocit/instantCode/commit/78d18b4468607135eb63aad03b19e291a64aeaae))
* **inspector:** exit inspect mode when closing card with toggle ([7012fc7](https://github.com/nguyenvanduocit/instantCode/commit/7012fc7dc9123272436d091477074c7eff6f3544))
* **inspector:** remove message deduplication causing init message to disappear ([3705fb0](https://github.com/nguyenvanduocit/instantCode/commit/3705fb0ee412b420261f5b9ece8e463e866050e4))
* **inspector:** revert to PNG for transparent background support ([962d653](https://github.com/nguyenvanduocit/instantCode/commit/962d653e747638a9a2b9b7a2be5f63e28fcf17ec))
* **inspector:** revert to PNG for transparent background support ([6275fb5](https://github.com/nguyenvanduocit/instantCode/commit/6275fb5e1651caf20c9853920c72d6da074cf0da))
* **inspector:** send full file path for image uploads ([d93e6a6](https://github.com/nguyenvanduocit/instantCode/commit/d93e6a6d4455724ff574f78612273a2f5c79d2d8))
* **server:** accept full file path in upload-image endpoint ([35ee512](https://github.com/nguyenvanduocit/instantCode/commit/35ee512210f8befc482c2ae2c96cbfc648947128))
* **server:** improve return statement in upload-image endpoint ([a8b8738](https://github.com/nguyenvanduocit/instantCode/commit/a8b87387df10121679bec4b69b4a9b7fab2c0078))
* **server:** simplify public address handling ([37e7581](https://github.com/nguyenvanduocit/instantCode/commit/37e75813334fd2d57cf26cd3a037e38166c2b28d))

## [1.11.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.10.0...v1.11.0) (2025-09-10)


### Features

* **inspector:** add imagePaths parameter to buildHierarchicalStructure ([3798c5f](https://github.com/nguyenvanduocit/instantCode/commit/3798c5f7307b1b4b123d843e4e5b3e228a5f33cf))
* **inspector:** add screenshot capture of selected elements ([7c5d8d9](https://github.com/nguyenvanduocit/instantCode/commit/7c5d8d90e1b015ba0a7e8461cc3ee0f8eddaedcd))
* **inspector:** improve screenshot filename format with element metadata ([baeceff](https://github.com/nguyenvanduocit/instantCode/commit/baeceff29ea535a449dc84a5e91c5c592d2adaa3))
* **inspector:** integrate imagePath field with client and server ([9f9e098](https://github.com/nguyenvanduocit/instantCode/commit/9f9e09826163d4489bec1e70af0a6bea125ec742))
* **schemas:** add computed styles to ElementDataSchema ([e6bc7a9](https://github.com/nguyenvanduocit/instantCode/commit/e6bc7a908a2c4385b90175e7dcf276060f618237))
* **schemas:** add imagePath parameter to buildHierarchicalStructure ([93f38c9](https://github.com/nguyenvanduocit/instantCode/commit/93f38c9bea7c5da055e694fc88b1c925ae182c14))
* **schemas:** add imagePath to ElementDataSchema ([7c95f73](https://github.com/nguyenvanduocit/instantCode/commit/7c95f73cddf0582e1f2353a37b02653bff31a6d3))
* **server:** add POST endpoint for base64 image upload ([e0baafd](https://github.com/nguyenvanduocit/instantCode/commit/e0baafd0ed69ad20bc1749ef0b5d741fedaad5f0))


### Bug Fixes

* **inspector:** send full file path for image uploads ([d93e6a6](https://github.com/nguyenvanduocit/instantCode/commit/d93e6a6d4455724ff574f78612273a2f5c79d2d8))
* **server:** accept full file path in upload-image endpoint ([35ee512](https://github.com/nguyenvanduocit/instantCode/commit/35ee512210f8befc482c2ae2c96cbfc648947128))
* **server:** improve return statement in upload-image endpoint ([a8b8738](https://github.com/nguyenvanduocit/instantCode/commit/a8b87387df10121679bec4b69b4a9b7fab2c0078))
* **server:** simplify public address handling ([37e7581](https://github.com/nguyenvanduocit/instantCode/commit/37e75813334fd2d57cf26cd3a037e38166c2b28d))

## [1.10.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.9.2...v1.10.0) (2025-08-27)


### Features

* **config:** add configurable listen and public addresses ([49d8a25](https://github.com/nguyenvanduocit/instantCode/commit/49d8a2533237494d29394268867243bddf52af4f))
* **server:** add configurable listen and public addresses ([6c13e3c](https://github.com/nguyenvanduocit/instantCode/commit/6c13e3c8d78613b0b94ab99a0b1f39091b85770b))

## [1.9.2](https://github.com/nguyenvanduocit/instantCode/compare/v1.9.1...v1.9.2) (2025-08-20)


### Bug Fixes

* **inspector:** exit inspect mode when closing card with toggle ([78d18b4](https://github.com/nguyenvanduocit/instantCode/commit/78d18b4468607135eb63aad03b19e291a64aeaae))
* **inspector:** exit inspect mode when closing card with toggle ([7012fc7](https://github.com/nguyenvanduocit/instantCode/commit/7012fc7dc9123272436d091477074c7eff6f3544))

## [1.9.1](https://github.com/nguyenvanduocit/instantCode/compare/v1.9.0...v1.9.1) (2025-08-20)


### Bug Fixes

* **inspector:** remove message deduplication causing init message to disappear ([3705fb0](https://github.com/nguyenvanduocit/instantCode/commit/3705fb0ee412b420261f5b9ece8e463e866050e4))

## [1.9.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.8.0...v1.9.0) (2025-08-19)


### Features

* **inspector:** enhance component detection with React support and source mapping ([7cf34f9](https://github.com/nguyenvanduocit/instantCode/commit/7cf34f9e75f9c2cfd01eac5ea4a0a71fddb520ca))

## [1.8.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.7.0...v1.8.0) (2025-08-19)


### Features

* **inspector:** add mock mode support and enhance message display ([0450da5](https://github.com/nguyenvanduocit/instantCode/commit/0450da598254ebec9db810e6cf4aefd7a07a9cb9))

## [1.7.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.6.0...v1.7.0) (2025-08-19)


### Features

* **vite:** restrict plugin to development mode only ([c006dae](https://github.com/nguyenvanduocit/instantCode/commit/c006dae7969ece2e778a22f967b33a4c1ad3dff0))

## [1.6.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.5.0...v1.6.0) (2025-08-19)


### Features

* **build:** add TypeScript declaration file generation ([2d49d0e](https://github.com/nguyenvanduocit/instantCode/commit/2d49d0e58a6938dab604980d299720596fe87c98))

## [1.5.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.4.0...v1.5.0) (2025-08-19)


### Features

* **vite:** add Vite plugin for seamless development integration ([b1d86fc](https://github.com/nguyenvanduocit/instantCode/commit/b1d86fcf88815a999adda5f87549726b4a254f63))

## [1.4.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.3.0...v1.4.0) (2025-08-18)


### Features

* **inspector:** improve processing state management and message handling ([5586f7b](https://github.com/nguyenvanduocit/instantCode/commit/5586f7ba03285c85fdbec118bd246d0c1a4f924a))

## [1.3.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.2.0...v1.3.0) (2025-08-18)


### Features

* simplify CI/CD with release-please automation ([bd798c0](https://github.com/nguyenvanduocit/instantCode/commit/bd798c096f3e581ede1f48940a5a019c90dca5be))

## [1.2.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.1.0...v1.2.0) (2025-08-18)


### Features

* simplify CI/CD with release-please automation ([bd798c0](https://github.com/nguyenvanduocit/instantCode/commit/bd798c096f3e581ede1f48940a5a019c90dca5be))

## [1.1.0](https://github.com/nguyenvanduocit/instantCode/compare/v1.0.0...v1.1.0) (2025-08-18)


### Features

* simplify CI/CD with release-please automation ([bd798c0](https://github.com/nguyenvanduocit/instantCode/commit/bd798c096f3e581ede1f48940a5a019c90dca5be))

## 1.0.0 (2025-08-18)


### Features

* simplify CI/CD with release-please automation ([bd798c0](https://github.com/nguyenvanduocit/instantCode/commit/bd798c096f3e581ede1f48940a5a019c90dca5be))
