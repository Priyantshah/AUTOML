import React, { createContext, useState, useContext } from 'react';

const AutoMLContext = createContext();

export const useAutoML = () => useContext(AutoMLContext);

export const AutoMLProvider = ({ children }) => {
    // Helper to initialize state from localStorage
    const getInitialState = (key, defaultValue) => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (e) {
            console.error(`Error loading ${key} from localStorage`, e);
            return defaultValue;
        }
    };

    const [fileUrl, setFileUrlState] = useState(() => getInitialState('fileUrl', null));
    const [metadata, setMetadataState] = useState(() => getInitialState('metadata', null));
    const [targetColumn, setTargetColumnState] = useState(() => getInitialState('targetColumn', null));
    const [edaResults, setEdaResultsState] = useState(() => getInitialState('edaResults', null));
    const [trainResults, setTrainResultsState] = useState(() => getInitialState('trainResults', null));
    const [modelUrl, setModelUrlState] = useState(() => getInitialState('modelUrl', null));

    // Wrappers to update both state and localStorage
    const setFileUrl = (value) => {
        setFileUrlState(value);
        localStorage.setItem('fileUrl', JSON.stringify(value));
    };
    const setMetadata = (value) => {
        setMetadataState(value);
        localStorage.setItem('metadata', JSON.stringify(value));
    };
    const setTargetColumn = (value) => {
        setTargetColumnState(value);
        localStorage.setItem('targetColumn', JSON.stringify(value));
    };
    const setEdaResults = (value) => {
        setEdaResultsState(value);
        localStorage.setItem('edaResults', JSON.stringify(value));
    };
    const setTrainResults = (value) => {
        setTrainResultsState(value);
        localStorage.setItem('trainResults', JSON.stringify(value));
    };
    const setModelUrl = (value) => {
        setModelUrlState(value);
        localStorage.setItem('modelUrl', JSON.stringify(value));
    };

    const value = {
        fileUrl, setFileUrl,
        metadata, setMetadata,
        targetColumn, setTargetColumn,
        edaResults, setEdaResults,
        trainResults, setTrainResults,
        modelUrl, setModelUrl
    };

    return (
        <AutoMLContext.Provider value={value}>
            {children}
        </AutoMLContext.Provider>
    );
};
