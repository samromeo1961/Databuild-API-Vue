const axios = require('axios');

/**
 * Example: Send data to zzTakeoff external API
 * This demonstrates how to make HTTP calls to external APIs
 * from the main Electron process (serverless architecture)
 *
 * IPC Handler: 'external:send-to-zztakeoff'
 *
 * NOTE: This currently returns sample success response for demonstration.
 * Replace with actual zzTakeoff API calls when API is available.
 */
async function sendToZzTakeoff(event, data) {
  try {
    const { projectId, items } = data;

    // For now, return sample success response
    // TODO: Replace with actual API call when zzTakeoff API is available

    console.log(`[DEMO] Would send ${items.length} item(s) to project ${projectId}`);
    console.log('[DEMO] Items:', JSON.stringify(items, null, 2));

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      message: `Successfully sent ${items.length} item(s) to zzTakeoff (demo mode)`,
      data: {
        itemsCreated: items.length,
        projectId: projectId,
        timestamp: new Date().toISOString()
      }
    };

    /*
    // When real API is available, use this code instead:
    const { apiKey } = data;
    const apiUrl = 'https://api.zztakeoff.com/v1/projects';

    const response = await axios.post(
      `${apiUrl}/${projectId}/items`,
      {
        items: items
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      success: true,
      message: 'Data sent successfully to zzTakeoff',
      data: response.data
    };
    */

  } catch (err) {
    console.error('Error sending to zzTakeoff:', err);
    return {
      success: false,
      error: 'Failed to send data to zzTakeoff',
      message: err.message,
      statusCode: err.response?.status
    };
  }
}

/**
 * Example: Get projects from zzTakeoff API
 * IPC Handler: 'external:get-zztakeoff-projects'
 *
 * NOTE: This currently returns sample data for demonstration.
 * Replace with actual zzTakeoff API calls when API is available.
 */
async function getZzTakeoffProjects(event, data) {
  try {
    // For now, return sample projects similar to zzTakeoff's structure
    // TODO: Replace with actual API call when zzTakeoff API is available

    // Sample projects matching zzTakeoff's structure
    const sampleProjects = [
      {
        id: 'demo-metric-1',
        name: 'Demo Metric',
        workspace: "zzTakeoff Demo's Projects",
        favorite: false,
        recent: true
      },
      {
        id: 'test-lagging-pdf-1',
        name: 'Test Lagging PDF',
        workspace: "zzTakeoff Demo's Projects",
        favorite: false,
        recent: true
      },
      {
        id: 'american-farmhouse-1',
        name: 'American Farmhouse',
        workspace: "zzTakeoff Demo's Projects",
        favorite: false,
        recent: false
      },
      {
        id: 'commercial-project-1',
        name: 'Commercial Project',
        workspace: "zzTakeoff Demo's Projects",
        favorite: false,
        recent: false
      },
      {
        id: 'farmhouse-1',
        name: 'farmhouse',
        workspace: "zzTakeoff Demo's Projects",
        favorite: false,
        recent: false
      },
      {
        id: 'farmhouse-demo-1',
        name: 'Farmhouse Demo',
        workspace: "zzTakeoff Demo's Projects",
        favorite: false,
        recent: false
      },
      {
        id: 'holidays-1',
        name: 'Holidays',
        workspace: "zzTakeoff Demo's Projects",
        favorite: false,
        recent: false
      }
    ];

    // Get unique workspaces
    const workspaces = [...new Set(sampleProjects.map(p => p.workspace))];

    return {
      success: true,
      data: {
        projects: sampleProjects,
        workspaces: workspaces
      }
    };

    /*
    // When real API is available, use this code instead:
    const { apiKey } = data;
    const apiUrl = 'https://api.zztakeoff.com/v1/projects';

    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return {
      success: true,
      data: response.data
    };
    */

  } catch (err) {
    console.error('Error fetching zzTakeoff projects:', err);
    return {
      success: false,
      error: 'Failed to fetch projects',
      message: err.message,
      statusCode: err.response?.status
    };
  }
}

/**
 * Get zzTakeoff takeoff types
 * IPC Handler: 'external:get-zztakeoff-takeoff-types'
 *
 * NOTE: This currently returns sample data for demonstration.
 * Replace with actual zzTakeoff API calls when API is available.
 */
async function getZzTakeoffTakeoffTypes(event, data) {
  try {
    // Sample takeoff types matching zzTakeoff's structure
    const sampleTakeoffTypes = [
      { id: 'area', name: 'Area' },
      { id: 'linear', name: 'Linear' },
      { id: 'count', name: 'Count' },
      { id: 'volume', name: 'Volume' }
    ];

    return {
      success: true,
      data: sampleTakeoffTypes
    };
  } catch (err) {
    console.error('Error fetching zzTakeoff takeoff types:', err);
    return {
      success: false,
      error: 'Failed to fetch takeoff types',
      message: err.message
    };
  }
}

/**
 * Get zzTakeoff cost types
 * IPC Handler: 'external:get-zztakeoff-cost-types'
 *
 * NOTE: This currently returns sample data for demonstration.
 * Replace with actual zzTakeoff API calls when API is available.
 */
async function getZzTakeoffCostTypes(event, data) {
  try {
    // Sample cost types matching zzTakeoff's structure
    const sampleCostTypes = [
      { id: 'material', name: 'Material' },
      { id: 'labor', name: 'Labor' },
      { id: 'equipment', name: 'Equipment' },
      { id: 'subcontractor', name: 'Subcontractor' }
    ];

    return {
      success: true,
      data: sampleCostTypes
    };
  } catch (err) {
    console.error('Error fetching zzTakeoff cost types:', err);
    return {
      success: false,
      error: 'Failed to fetch cost types',
      message: err.message
    };
  }
}

/**
 * Example: Generic HTTP request handler
 * IPC Handler: 'external:http-request'
 *
 * This allows the frontend to make arbitrary HTTP requests
 * through the main process (useful for any external API)
 */
async function makeHttpRequest(event, config) {
  try {
    const { method, url, data, headers, timeout = 15000 } = config;

    const response = await axios({
      method: method || 'GET',
      url,
      data,
      headers: headers || {},
      timeout
    });

    return {
      success: true,
      status: response.status,
      headers: response.headers,
      data: response.data
    };

  } catch (err) {
    console.error('HTTP request error:', err);
    return {
      success: false,
      error: 'HTTP request failed',
      message: err.message,
      status: err.response?.status,
      data: err.response?.data
    };
  }
}

module.exports = {
  sendToZzTakeoff,
  getZzTakeoffProjects,
  getZzTakeoffTakeoffTypes,
  getZzTakeoffCostTypes,
  makeHttpRequest
};
