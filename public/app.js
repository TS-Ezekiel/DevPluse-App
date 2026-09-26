// public/app.js

let latencyChart = null;
let selectedServiceId = null;

// DOM Elements
const servicesContainer = document.getElementById('services-container');
const serviceCount = document.getElementById('service-count');
const addServiceForm = document.getElementById('add-service-form');
const chartTitle = document.getElementById('active-chart-title');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  fetchServices();
  
  // Poll for live metrics every 5 seconds
  setInterval(fetchServices, 5000);

  // Form submission handler
  addServiceForm.addEventListener('submit', handleAddService);
});

/**
 * Fetch all monitored services from Express API
 */
async function fetchServices() {
  try {
    const res = await fetch('/api/services');
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    
    const services = await res.json();
    renderServiceCards(services);

    // Auto-select the first service for the chart on initial load if none selected
    if (services.length > 0 && !selectedServiceId) {
      selectService(services[0]._id, services[0].name);
    } else if (services.length === 0) {
      servicesContainer.innerHTML = `<div class="loading-state">No services added yet. Add an endpoint above to begin monitoring!</div>`;
      serviceCount.textContent = '0 Active';
    }
  } catch (err) {
    console.error('Failed to fetch services:', err);
    servicesContainer.innerHTML = `<div class="loading-state" style="color: var(--color-down);">Error connecting to backend API.</div>`;
  }
}

/**
 * Render service cards into the DOM
 */
function renderServiceCards(services) {
  serviceCount.textContent = `${services.length} Active`;

  if (services.length === 0) {
    servicesContainer.innerHTML = `<div class="loading-state">No services added yet. Add an endpoint above to begin monitoring!</div>`;
    if (latencyChart) latencyChart.destroy();
    chartTitle.textContent = 'No service selected';
    selectedServiceId = null;
    return;
  }

  servicesContainer.innerHTML = '';

  services.forEach(service => {
    const card = document.createElement('div');
    card.className = 'service-card';
    
    if (service._id === selectedServiceId) {
      card.style.borderColor = 'var(--primary-accent)';
    }

    const statusClass = (service.currentStatus || 'UNKNOWN').toLowerCase();

    card.innerHTML = `
      <div class="card-top">
        <span class="service-name">${escapeHtml(service.name)}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="status-badge ${statusClass}">${service.currentStatus || 'UNKNOWN'}</span>
          <button class="delete-btn" title="Delete endpoint">&times;</button>
        </div>
      </div>
      <div class="service-url">${escapeHtml(service.url)}</div>
      <div class="card-bottom">
        <span>Latency: <strong>${service.lastResponseTime || 0}ms</strong></span>
        <span>${formatTime(service.lastChecked)}</span>
      </div>
    `;

    // Click card to view chart metrics
    card.addEventListener('click', (e) => {
      // Don't select service if user clicked the delete button
      if (e.target.classList.contains('delete-btn')) return;
      selectService(service._id, service.name);
    });

    // Delete button click handler
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop event from triggering card selection
      deleteService(service._id, service.name);
    });

    servicesContainer.appendChild(card);
  });
}

/**
 * Delete a service by ID
 */
async function deleteService(serviceId, serviceName) {
  if (!confirm(`Are you sure you want to delete "${serviceName}"?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/services/${serviceId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      throw new Error('Failed to delete service');
    }

    // Reset chart selection if the active service was deleted
    if (selectedServiceId === serviceId) {
      selectedServiceId = null;
    }

    // Refresh dashboard list
    fetchServices();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

/**
 * Handle adding a new endpoint
 */
async function handleAddService(e) {
  e.preventDefault();

  const nameInput = document.getElementById('service-name');
  const urlInput = document.getElementById('service-url');

  const newService = {
    name: nameInput.value.trim(),
    url: urlInput.value.trim()
  };

  try {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newService)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to add service');
    }

    // Reset inputs & refresh UI
    nameInput.value = '';
    urlInput.value = '';
    
    const createdService = await res.json();
    fetchServices();
    selectService(createdService._id, createdService.name);

  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

/**
 * Select a service to display historical latency logs in Chart.js
 */
async function selectService(serviceId, serviceName) {
  selectedServiceId = serviceId;
  chartTitle.textContent = `Showing historical metrics for ${serviceName}`;

  try {
    const res = await fetch(`/api/services/${serviceId}/logs`);
    if (!res.ok) throw new Error('Failed to load logs');

    const logs = await res.json();
    renderChart(logs, serviceName);
  } catch (err) {
    console.error('Error fetching logs for chart:', err);
  }
}

// Attach function to global window scope for inline onclick handlers
window.selectService = selectService;

/**
 * Render or update Chart.js Line Chart
 */
function renderChart(logs, serviceName) {
  const ctx = document.getElementById('latencyChart').getContext('2d');

  // Format timestamps and response times
  const labels = logs.map(log => new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const dataPoints = logs.map(log => log.responseTime);

  if (latencyChart) {
    latencyChart.destroy(); // Clear existing instance before drawing
  }

  latencyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `${serviceName} Latency (ms)`,
        data: dataPoints,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#6366f1',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#f8fafc', font: { family: 'Inter' } }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
          title: {
            display: true,
            text: 'Response Time (ms)',
            color: '#94a3b8'
          }
        }
      }
    }
  });
}

/**
 * Utility: Format ISO timestamp to relative or time string
 */
function formatTime(isoString) {
  if (!isoString) return 'Pending check';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Utility: Escape HTML to prevent XSS injection
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}