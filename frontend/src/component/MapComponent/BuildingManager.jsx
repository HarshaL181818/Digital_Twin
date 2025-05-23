import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BuildingManager = ({ map, clickedLocation }) => {
  const [buildingWidth, setBuildingWidth] = useState(30);
  const [buildingHeight, setBuildingHeight] = useState(50);
  const [buildingColor, setBuildingColor] = useState('#ff0000');
  const [buildingRotation, setBuildingRotation] = useState(0);
  const [buildingType, setBuildingType] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const API_BASE_URL = 'http://localhost:8080/api/buildings';

  const buildingTypes = [
    "Residential Building",
    "Market/Shopping Area",
    "Office Building",
    "Factory/Warehouse",
    "Power Plant",
    "Transport Hub",
    "Educational Institution",
    "Government Office",
    "Park",
    "Cinema/Entertainment",
    "Gym/Sports Arena",
    "Healthcare Facility",
  ];

  // Load buildings on component mount
  // useEffect(() => {
  //   loadBuildings();
  // }, []);

  // // Update building visualization when buildings change
  // useEffect(() => {
  //   if (map) {
  //     // Ensure the map style is fully loaded
  //     map.on('style.load', () => {
  //       buildings.forEach(displayBuilding); // Once style is loaded, display buildings
  //     });
  //   }
  // }, [buildings, map]);
  // const loadBuildings = async () => {
  //   try {
  //     const response = await axios.get(API_BASE_URL);
  //     setBuildings(response.data);
  //   } catch (error) {
  //     console.error('Failed to load buildings:', error);
  //   }
  // };
  useEffect(() => {
  // Load initial buildings from localStorage if needed
  const stored = localStorage.getItem('buildings');
  if (stored) {
    setBuildings(JSON.parse(stored));
  }
}, []);


  const displayBuilding = (building) => {
    if (!map) return;
  
    const buildingId = `building-${building.id}`;
    const labelId = `${buildingId}-label`;
    
    // Remove existing layers and sources
    [buildingId, labelId].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });
  
    // Add building extrusion
    map.addSource(buildingId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {
          height: building.height,
          base: 0
        },
        geometry: {
          type: 'Polygon',
          coordinates: building.coordinates
        }
      }
    });
  
    map.addLayer({
      id: buildingId,
      type: 'fill-extrusion',
      source: buildingId,
      paint: {
        'fill-extrusion-color': building.color,
        'fill-extrusion-height': building.height,
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.8
      }
    });

    // Add label
    const center = building.coordinates[0].reduce((acc, curr) => [
      acc[0] + curr[0],
      acc[1] + curr[1]
    ], [0, 0]).map(coord => coord / building.coordinates[0].length);

    map.addSource(labelId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: center
        },
        properties: {
          text: `#${building.id}\n${building.type}`
        }
      }
    });

    map.addLayer({
      id: labelId,
      type: 'symbol',
      source: labelId,
      layout: {
        'text-field': ['get', 'text'],
        'text-anchor': 'center',
        'text-size': 12,
        'text-offset': [0, -1]
      },
      paint: {
        'text-color': '#000',
        'text-halo-color': '#fff',
        'text-halo-width': 2
      }
    });
  };

  const handleAddBuilding = async () => {
  if (!clickedLocation || !buildingType) {
    alert('Please select a location and building type');
    return;
  }

  const lat = clickedLocation[1];
  const lng = clickedLocation[0];

  const response = await fetch(
    `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${import.meta.env.VITE_REACT_APP_AQICN_TOKEN}`
  );

  if (!response.ok) {
    alert('Failed to fetch AQI data');
    return;
  }

  const data = await response.json();
  const aqi = data.data?.aqi;
  if (aqi === undefined) {
    alert('Invalid AQI data. Please try again.');
    return;
  }

  const buildingAqiLimits = {
    "Residential Building": 200,
    "Market/Shopping Area": 150,
    "Office Building": 100,
    "Factory/Warehouse": 300,
    "Power Plant": 400,
    "Transport Hub": 150,
    "Educational Institution": 100,
    "Government Office": 150,
    "Park": 50,
    "Cinema/Entertainment": 100,
    "Gym/Sports Arena": 100,
    "Healthcare Facility": 50,
  };

  const maxAqiAllowed = buildingAqiLimits[buildingType] || 200;
  if (aqi > maxAqiAllowed) {
    alert(`AQI too high for a ${buildingType}. AQI: ${aqi}`);
    return;
  }

  const size = buildingWidth / 111111;
  const coordinates = getRotatedCoordinates(clickedLocation, size, buildingRotation);

  // Generate local ID
  const newId = buildings.length > 0 ? Math.max(...buildings.map(b => b.id)) + 1 : 1;

  const newBuilding = {
    id: newId,
    location: clickedLocation,
    coordinates,
    width: buildingWidth,
    height: buildingHeight,
    color: buildingColor,
    rotation: buildingRotation,
    type: buildingType,
  };

  setBuildings(prev => {
    const updated = [...prev, newBuilding];
    localStorage.setItem('buildings', JSON.stringify(updated)); // Optional persistence
    return updated;
  });

  setBuildingType('');
  displayBuilding(newBuilding);
};

  
  const handleDeleteBuilding = async (buildingId) => {
  try {
    // Remove building from map
    const buildingLayerId = `building-${buildingId}`;
    const labelLayerId = `${buildingLayerId}-label`;

    [buildingLayerId, labelLayerId].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });

    // Remove building from state
    setBuildings(prev => prev.filter(b => b.id !== buildingId));
    setSelectedBuilding(null);

    // Remove building from localStorage
    const storedBuildings = JSON.parse(localStorage.getItem('buildings')) || [];
    const updatedBuildings = storedBuildings.filter(b => b.id !== buildingId);
    localStorage.setItem('buildings', JSON.stringify(updatedBuildings));

  } catch (error) {
    console.error('Failed to delete building:', error);
    alert('Failed to delete building. Please try again.');
  }
};


const handleUpdateBuilding = async () => {
  if (!selectedBuilding) return;

  const size = buildingWidth / 111111;
  const coordinates = getRotatedCoordinates(
    selectedBuilding.location,
    size,
    buildingRotation
  );

  const updatedBuilding = {
    ...selectedBuilding,
    width: buildingWidth,
    height: buildingHeight,
    color: buildingColor,
    rotation: buildingRotation,
    type: buildingType,
    coordinates,
  };

  try {
    // Update building in state
    setBuildings(prev =>
      prev.map(b => (b.id === selectedBuilding.id ? updatedBuilding : b))
    );

    // Update building on the map
    displayBuilding(updatedBuilding);

    // Update the building in localStorage
    const storedBuildings = JSON.parse(localStorage.getItem('buildings')) || [];
    const updatedBuildings = storedBuildings.map(b =>
      b.id === selectedBuilding.id ? updatedBuilding : b
    );
    localStorage.setItem('buildings', JSON.stringify(updatedBuildings));

    // Clear selection and reset input fields
    setSelectedBuilding(null);
    setBuildingType('');
  } catch (error) {
    console.error('Failed to update building:', error);
    alert('Failed to update building. Please try again.');
  }
};


  const handleSelectBuilding = (building) => {
    setSelectedBuilding(building);
    setBuildingWidth(building.width);
    setBuildingHeight(building.height);
    setBuildingColor(building.color);
    setBuildingRotation(building.rotation || 0);
    setBuildingType(building.type || '');

    // Center map on selected building
    if (map) {
      const center = building.coordinates[0].reduce((acc, curr) => [
        acc[0] + curr[0],
        acc[1] + curr[1]
      ], [0, 0]).map(coord => coord / building.coordinates[0].length);
      
      map.flyTo({
        center: center,
        zoom: 17,
        pitch: 60
      });
    }
  };

  const getRotatedCoordinates = (center, size, rotation) => {
    const rad = (rotation * Math.PI) / 180;
    const points = [
      [-size / 2, -size / 2],
      [size / 2, -size / 2],
      [size / 2, size / 2],
      [-size / 2, size / 2],
    ];

    return [
      points.map(([x, y]) => [
        center[0] + x * Math.cos(rad) - y * Math.sin(rad),
        center[1] + x * Math.sin(rad) + y * Math.cos(rad),
      ]),
    ];
  };

  return (
    <div className="  bg-gray-50">
      <h3 className="text-xl font-bold text-gray-800">Building Controls</h3>
      
      <div className="space-y-1">
        <div>
          <label className="block mb-2">Building Type:</label>
          <select
            className="w-full p-1 border rounded"
            value={buildingType}
            onChange={(e) => setBuildingType(e.target.value)}
          >
            <option value="">Select building type</option>
            {buildingTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block ">Width (m):</label>
          <input
            type="number"
            className="w-full p-1 border rounded"
            value={buildingWidth}
            onChange={(e) => setBuildingWidth(Number(e.target.value))}
            min="1"
            max="100"
          />
        </div>

        <div>
          <label className="block">Height (m):</label>
          <input
            type="number"
            className="w-full p-1 border rounded"
            value={buildingHeight}
            onChange={(e) => setBuildingHeight(Number(e.target.value))}
            min="1"
            max="100"
          />
        </div>

        <div>
          <label className="block">Rotation (degrees):</label>
          <input
            type="number"
            className="w-full p-1 border rounded"
            value={buildingRotation}
            onChange={(e) => setBuildingRotation(Number(e.target.value))}
            min="0"
            max="360"
          />
        </div>

        <div>
          <label className="block">Color:</label>
          <input
            type="color"
            className="w-full p-1 border rounded"
            value={buildingColor}
            onChange={(e) => setBuildingColor(e.target.value)}
          />
        </div>

        <button
          className="w-full p-1 bg-blue-500 text-white rounded disabled:opacity-50"
          onClick={handleAddBuilding}
          disabled={!clickedLocation || !buildingType}
        >
          Add Building
        </button>
      </div>

      {selectedBuilding && (
        <div className="mt-3">
          <h4 className="text-lg font-semibold mb-2">Selected Building #{selectedBuilding.id}</h4>
          <div className="space-y-1">
            <button
              className="w-full bg-green-500 text-white rounded"
              onClick={handleUpdateBuilding}
            >
              Update Building
            </button>
            <button
              className="w-full bg-red-500 text-white rounded"
              onClick={() => handleDeleteBuilding(selectedBuilding.id)}
            >
              Delete Building
            </button>
          </div>
        </div>
      )}

      <div className="mt-3  ">
        <h3 className="text-lg font-semibold">Buildings List</h3>
        <div className="space-y-0">
          {buildings.map((building) => (
            <div
              key={building.id}
              className={`p-1 border rounded cursor-pointer ${
                building.id === selectedBuilding?.id ? 'bg-gray-100 border-blue-500' : 'bg-white'
              }`}
              onClick={() => handleSelectBuilding(building)}
            >
              <div className="flex justify-between items-center">
                <div>
                  {/* <strong>#{building.id}</strong> */}
                  <div>{building.type || 'Unknown type'}</div>
                  <div className="text-sm text-gray-600">
                    {/* {building.width}m × {building.height}m */}
                  </div>
                </div>
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: building.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BuildingManager;