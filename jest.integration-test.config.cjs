module.exports = async () => {
    return {
        rootDir: "./",
        verbose: true,
        transform: {
            "^.+\\.js?$": "babel-jest",
        },
        transformIgnorePatterns: [
            "node_modules/(?!(sc-base-database|sc-common|sc-game-base|sc-base-apis|sc-api-client|sc-slot-game-base|sc-cascading-slot-base|sc-game-service-integration-utils|axios|d3-array|internmap)/)",
        ],
        testEnvironment: "node",
        testResultsProcessor: "jest-junit",
        setupFilesAfterEnv: ["jest-extended"],
        globalSetup: "<rootDir>/tests/integration-tests/global-setup.cjs",
        globalTeardown: "<rootDir>/tests/integration-tests/global-teardown.cjs",
        testTimeout: 30000,
    };
};
