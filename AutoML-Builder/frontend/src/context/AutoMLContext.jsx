import React, { createContext, useState, useContext } from 'react';

const AutoMLContext = createContext();

export const useAutoML = () => useContext(AutoMLContext);

export const AutoMLProvider = ({ children }) => {
    const [fileUrl, setFileUrl] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [targetColumn, setTargetColumn] = useState(null);
    const [edaResults, setEdaResults] = useState(null);
    const [trainResults, setTrainResults] = useState(null);
    const [modelUrl, setModelUrl] = useState(null);

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
