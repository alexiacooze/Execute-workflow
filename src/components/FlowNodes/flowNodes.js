import React, { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MiniMap,
  reconnectEdge,
} from "@xyflow/react";
import axios from "axios";
import "@xyflow/react/dist/style.css";
import ClipLoader from "react-spinners/ClipLoader";
import "../FlowNodes/flowNodes.css";
import CustomEdge from "./EdgeType/edgeType"; // Ensure correct import path

const edgeTypes = {
  custom: CustomEdge, // Register your custom edge type
};

const initialNodes = [
  {
    id: "1",
    position: { x: 0, y: 0 },
    data: {
      label: "Generated Numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]",
    },
  },
  {
    id: "2",
    position: { x: 100, y: 100 },
    data: {
      label: "Filter Generated Numbers: Return Even Numbers",
      script: `def main(): 
                    numbers = [num for num in range(1, 11)]
                    return {"even_numbers": [num for num in numbers if num % 2 == 0]}
                \nmain()`,
    },
  },
  {
    id: "3",
    position: { x: 100, y: 200 },
    data: {
      label: "Result: Sum of Even Numbers",
      script: `def main():
                    even_numbers = ${JSON.stringify([])} 
                    return {"sum":  sum(even_numbers)}
                \nmain()`,
    },
  },
];

const initialEdges = [
  {
    id: "1-2",
    source: "1",
    target: "2",
    type: "custom", // Specify custom type here
    label: "reconnectable edge",
  },
  {
    id: "2-3",
    source: "2",
    target: "3",
    type: "custom", // Specify custom type here
  },
];

function Flow() {
  const edgeReconnectSuccessful = useRef(true);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [loading, setLoading] = useState(false);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: "custom" }, eds)), // Specify custom type here
    []
  );

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback((oldEdge, newConnection) => {
    edgeReconnectSuccessful.current = true;
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
  }, []);

  const onReconnectEnd = useCallback((_, edge) => {
    if (!edgeReconnectSuccessful.current) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }

    edgeReconnectSuccessful.current = true;
  }, []);

  const onEdgesContextMenu = useCallback(
    (event, edge) => {
      event.preventDefault();
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    },
    [setEdges]
  );

  const executeWorkflow = useCallback(async () => {
    const apiUrl = "/api/execute";
    console.log("API URL:", apiUrl);

    setLoading(true);
    let results = {};

    for (const node of nodes) {
      try {
        console.log("Sending request for node:", node.id);

        let nodeScript = node.data.script;
        if (node.id === "3" && results["2"] && results["2"].even_numbers) {
          nodeScript = nodeScript.replace(
            `${JSON.stringify([])}`,
            JSON.stringify(results["2"].even_numbers)
          );
        }

        const response = await axios.post(
          apiUrl,
          { script: nodeScript },
          { headers: { "Content-Type": "application/json" } }
        );

        console.log("API Response for node", node.id, ":", response.data);

        results[node.id] = response.data;

        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: { ...n.data, label: JSON.stringify(response.data) },
                }
              : n
          )
        );
      } catch (error) {
        console.error("Error fetching data from API for node:", node.id, error);
      }
    }
    setLoading(false);
  }, [nodes]);

  function MiniMapNode({ x, y, width, height, style }) {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          backgroundColor: "#grey",
          borderColor: "#000",
          strokeWidth: 1,
        }}
      />
    );
  }

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        edges={edges}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onEdgeContextMenu={onEdgesContextMenu}
        fitView
        edgeTypes={edgeTypes} // Pass custom edge types here
      >
        <Background />
        <button
          className="execute-button"
          onClick={executeWorkflow}
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 10,
          }}
        >
          Execute Script
        </button>
        <Controls />
        <MiniMap pannable zoomable nodeComponent={MiniMapNode} />
      </ReactFlow>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <ClipLoader size={50} color={"#123abc"} loading={loading} />
        </div>
      )}
    </div>
  );
}

export default Flow;
