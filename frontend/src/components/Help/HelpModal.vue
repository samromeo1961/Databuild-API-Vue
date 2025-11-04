<template>
  <div
    class="modal fade"
    id="helpModal"
    tabindex="-1"
    aria-labelledby="helpModalLabel"
    aria-hidden="true"
    ref="modalRef"
  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="helpModalLabel">
            <i class="bi bi-question-circle me-2"></i>
            DBx Connector Help
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <div class="container-fluid">
            <div class="row">
              <div class="col-12">

                <!-- Overview Section -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-info-circle me-2"></i>
                    Overview
                  </h4>
                  <p>
                    DBx Connector is an Electron desktop application that connects to Databuild SQL Server databases.
                    It provides a modern interface for viewing and managing catalogue items, recipes, suppliers, contacts,
                    and templates, with integration to zzTakeoff external API.
                  </p>
                </section>

                <!-- Getting Started -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-play-circle me-2"></i>
                    Getting Started
                  </h4>
                  <ol>
                    <li class="mb-2">
                      <strong>Database Connection:</strong> On first launch, enter your SQL Server connection details
                      (server, database, username, password).
                    </li>
                    <li class="mb-2">
                      <strong>Navigation:</strong> Use the tabs at the top to navigate between different sections
                      (Catalogue, Recipes, Suppliers, Contacts, etc.).
                    </li>
                    <li class="mb-2">
                      <strong>Search and Filter:</strong> Use the search bars and dropdown filters to find specific items.
                    </li>
                  </ol>
                </section>

                <!-- Catalogue Tab -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-grid-3x3-gap me-2"></i>
                    Catalogue Tab
                  </h4>
                  <p>View and manage catalogue items from your Databuild database.</p>
                  <ul>
                    <li><strong>Search:</strong> Search by item code, description, or cost centre</li>
                    <li><strong>Filter by Cost Centre:</strong> Use the dropdown to filter items by cost centre</li>
                    <li><strong>Edit Inline:</strong> Click on Description, Unit, or Price cells to edit directly</li>
                    <li><strong>Archive/Unarchive:</strong> Use the archive button in the Actions column</li>
                    <li><strong>Column Management:</strong> Click the columns icon to show/hide, reorder, or rename columns</li>
                    <li><strong>Export:</strong> Click the Excel icon to export data to CSV</li>
                  </ul>
                </section>

                <!-- Recipes Tab -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-book me-2"></i>
                    Recipes Tab
                  </h4>
                  <p>View and manage recipe items and their sub-items (ingredients).</p>
                  <ul>
                    <li><strong>Master/Detail View:</strong> Select a recipe in the top grid to view its sub-items below</li>
                    <li><strong>Filter by Cost Centre:</strong> Filter recipes by cost centre using the dropdown</li>
                    <li><strong>Archive/Unarchive:</strong> Archive recipes using the Actions column</li>
                    <li><strong>Export:</strong> Export recipes and sub-items to CSV</li>
                  </ul>
                </section>

                <!-- Suppliers Tab -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-building me-2"></i>
                    Suppliers Tab
                  </h4>
                  <p>Manage your supplier and subcontractor information.</p>
                  <ul>
                    <li><strong>Search:</strong> Search by supplier name, contact person, or email</li>
                    <li><strong>Filter by Group:</strong> Filter suppliers by supplier group</li>
                    <li><strong>Edit:</strong> Click the pencil icon to edit supplier details</li>
                    <li><strong>Archive:</strong> Archive suppliers using the archive button</li>
                    <li><strong>Show Archived:</strong> Toggle to view archived suppliers</li>
                  </ul>
                </section>

                <!-- Contacts Tab -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-people me-2"></i>
                    Contacts Tab
                  </h4>
                  <p>Manage contact records for clients, suppliers, and subcontractors.</p>
                  <ul>
                    <li><strong>Add New Contact:</strong> Click the green + button to create a new contact</li>
                    <li><strong>Edit Contact:</strong> Click the pencil icon or double-click a row to edit</li>
                    <li><strong>Search:</strong> Search by code, name, contact person, or email</li>
                    <li><strong>Filter by Group:</strong> Filter contacts by contact group (Clients, Suppliers, etc.)</li>
                    <li><strong>Contact Types:</strong> Mark contacts as Debtor, Supplier, or OSC (Subcontractor)</li>
                  </ul>
                </section>

                <!-- Templates Tab -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-file-earmark-text me-2"></i>
                    Templates Tab
                  </h4>
                  <p>View and manage template items.</p>
                  <ul>
                    <li><strong>Filter by Cost Centre:</strong> Filter templates by cost centre</li>
                    <li><strong>Search:</strong> Search templates by code or description</li>
                  </ul>
                </section>

                <!-- zzTakeoff Integration -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-cloud-upload me-2"></i>
                    zzTakeoff Integration
                  </h4>
                  <p>Send items directly to zzTakeoff.com via the zzTakeoff Web browser.</p>
                  <ul>
                    <li><strong>Send to zzTakeoff:</strong> From Catalogue or Recipes, select items and use the "Send to zzTakeoff" button</li>
                    <li><strong>Automatic Navigation:</strong> Clicking send automatically opens zzTakeoff Web and starts a new takeoff with your item</li>
                    <li><strong>Item Properties:</strong> Product ID, description, unit, price, and cost centre are automatically populated</li>
                  </ul>
                </section>

                <!-- zzTakeoff Web -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-browser-chrome me-2"></i>
                    zzTakeoff Web
                  </h4>
                  <p>Access zzTakeoff.com directly within the application using the embedded web browser.</p>

                  <h6 class="mt-3 mb-2"><strong>Navigation Controls</strong></h6>
                  <ul>
                    <li><strong>Back/Forward:</strong> Navigate through page history using arrow buttons</li>
                    <li><strong>Reload:</strong> Refresh the current page with the circular arrow button</li>
                    <li><strong>Login:</strong> Quick navigation to zzTakeoff login page with the house icon</li>
                    <li><strong>URL Bar:</strong> Shows the current page URL (read-only)</li>
                  </ul>

                  <h6 class="mt-3 mb-2"><strong>Find in Page</strong></h6>
                  <ul>
                    <li><strong>Open Find:</strong> Click the search icon <i class="bi bi-search"></i> in the toolbar to open the find bar</li>
                    <li><strong>Search:</strong> Type your search term to find text on the current page</li>
                    <li><strong>Navigate Results:</strong> Use the up/down chevron buttons or Enter/Shift+Enter to navigate matches</li>
                    <li><strong>Match Counter:</strong> View "X of Y matches" to see your position in results</li>
                    <li><strong>Close Find:</strong> Click the X button or press Esc to close the find bar</li>
                  </ul>
                  <p class="text-muted small">
                    <i class="bi bi-info-circle me-1"></i>
                    Note: Ctrl+F is used by zzTakeoff.com, so we provide a dedicated search icon instead.
                  </p>

                  <h6 class="mt-3 mb-2"><strong>Fullscreen Mode</strong></h6>
                  <ul>
                    <li><strong>Maximize:</strong> Click the fullscreen icon <i class="bi bi-fullscreen"></i> to maximize the web view and hide tabs/navigation</li>
                    <li><strong>Quick Return:</strong> Click "Back to [Tab Name]" to return to your last viewed tab while staying maximized</li>
                    <li><strong>Choose Tab from zzTakeoff Web:</strong> Click the dropdown arrow next to the back button to select which tab to return to</li>
                    <li><strong>Navigate Between Tabs in Fullscreen:</strong> When in fullscreen mode on any tab, use the "Navigate to Tab" dropdown to switch to other tabs (including zzTakeoff Web) without exiting fullscreen</li>
                    <li><strong>Exit Fullscreen:</strong> Select "Exit Fullscreen" from the dropdown or click the tab bar to restore normal view</li>
                  </ul>
                  <p class="text-muted small">
                    <i class="bi bi-info-circle me-1"></i>
                    Your last selected tab is saved and remembered for next time. You can navigate freely between all tabs while in fullscreen mode.
                  </p>

                  <h6 class="mt-3 mb-2"><strong>Additional Features</strong></h6>
                  <ul>
                    <li><strong>Dark Mode Toggle:</strong> Use the moon/sun icon in the toolbar to toggle dark mode independently</li>
                    <li><strong>Session Persistence:</strong> Login state and cookies are saved between sessions</li>
                    <li><strong>Native Performance:</strong> Uses Electron's BrowserView for native web rendering and better performance</li>
                  </ul>
                </section>

                <!-- Column Management -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-layout-three-columns me-2"></i>
                    Column Management
                  </h4>
                  <p>Customize grid columns to suit your workflow.</p>
                  <ul>
                    <li><strong>Show/Hide Columns:</strong> Click the columns icon, then check/uncheck columns</li>
                    <li><strong>Reorder Columns:</strong> Drag columns in the management panel to reorder</li>
                    <li><strong>Resize Columns:</strong> Drag column edges in the grid</li>
                    <li><strong>Rename Columns:</strong> Click the pencil icon in the management panel to add custom names</li>
                    <li><strong>Pin Columns:</strong> Pin columns to left or right for easy access</li>
                    <li><strong>Reset to Default:</strong> Use the "Reset to Default" button to restore original settings</li>
                  </ul>
                  <p class="text-muted small">
                    <i class="bi bi-info-circle me-1"></i>
                    Column settings are saved automatically and persist across sessions.
                  </p>
                </section>

                <!-- Dark Mode -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-moon me-2"></i>
                    Dark Mode
                  </h4>
                  <p>Toggle between light and dark themes using the moon/sun icon in the top-right corner of the application.</p>
                </section>

                <!-- Preferences -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-gear me-2"></i>
                    Preferences
                  </h4>
                  <p>Configure application settings in the Preferences tab.</p>
                  <ul>
                    <li><strong>Items Per Page:</strong> Set default pagination size for grids</li>
                    <li><strong>Theme:</strong> Choose between light and dark themes</li>
                    <li><strong>Database Settings:</strong> Update database connection details (use Ctrl+, or File menu)</li>
                  </ul>
                </section>

                <!-- Keyboard Shortcuts -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-keyboard me-2"></i>
                    Keyboard Shortcuts
                  </h4>

                  <h6 class="mt-3 mb-2"><strong>Application Shortcuts</strong></h6>
                  <div class="table-responsive">
                    <table class="table table-bordered table-sm">
                      <thead>
                        <tr>
                          <th>Shortcut</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><kbd>Ctrl</kbd> + <kbd>,</kbd></td>
                          <td>Open Database Settings</td>
                        </tr>
                        <tr>
                          <td><kbd>Ctrl</kbd> + <kbd>R</kbd></td>
                          <td>Reload Application</td>
                        </tr>
                        <tr>
                          <td><kbd>F12</kbd></td>
                          <td>Open Developer Tools</td>
                        </tr>
                        <tr>
                          <td><kbd>F1</kbd></td>
                          <td>Show Help (this window)</td>
                        </tr>
                        <tr>
                          <td><kbd>Alt</kbd> + <kbd>F4</kbd></td>
                          <td>Exit Application</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h6 class="mt-3 mb-2"><strong>Tab Navigation</strong></h6>
                  <div class="table-responsive">
                    <table class="table table-bordered table-sm">
                      <thead>
                        <tr>
                          <th>Shortcut</th>
                          <th>Tab</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><kbd>Ctrl</kbd> + <kbd>1</kbd></td>
                          <td>Catalogue</td>
                        </tr>
                        <tr>
                          <td><kbd>Ctrl</kbd> + <kbd>2</kbd></td>
                          <td>Recipes</td>
                        </tr>
                        <tr>
                          <td><kbd>Ctrl</kbd> + <kbd>3</kbd></td>
                          <td>Suppliers</td>
                        </tr>
                        <tr>
                          <td><kbd>Ctrl</kbd> + <kbd>4</kbd></td>
                          <td>Contacts</td>
                        </tr>
                        <tr>
                          <td><kbd>Ctrl</kbd> + <kbd>5</kbd></td>
                          <td>Templates</td>
                        </tr>
                        <tr>
                          <td><kbd>Ctrl</kbd> + <kbd>6</kbd></td>
                          <td>Favourites</td>
                        </tr>
                        <tr>
                          <td><kbd>Ctrl</kbd> + <kbd>7</kbd></td>
                          <td>Recents</td>
                        </tr>
                        <tr>
                          <td><kbd>Ctrl</kbd> + <kbd>8</kbd></td>
                          <td>zzTakeoff Web</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h6 class="mt-3 mb-2"><strong>General Shortcuts</strong></h6>
                  <div class="table-responsive">
                    <table class="table table-bordered table-sm">
                      <thead>
                        <tr>
                          <th>Shortcut</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><kbd>Enter</kbd></td>
                          <td>In modals: Submit/Save<br>In Find: Next match</td>
                        </tr>
                        <tr>
                          <td><kbd>Shift</kbd> + <kbd>Enter</kbd></td>
                          <td>In Find: Previous match</td>
                        </tr>
                        <tr>
                          <td><kbd>Esc</kbd></td>
                          <td>Close active modal or Find bar</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p class="text-muted small mt-3">
                    <i class="bi bi-info-circle me-1"></i>
                    All keyboard shortcuts can also be accessed via the application menu bar (File, View, Tabs, Help).
                  </p>
                </section>

                <!-- Troubleshooting -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-tools me-2"></i>
                    Troubleshooting
                  </h4>
                  <div class="accordion" id="troubleshootingAccordion">
                    <div class="accordion-item">
                      <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne">
                          Can't connect to database
                        </button>
                      </h2>
                      <div id="collapseOne" class="accordion-collapse collapse" data-bs-parent="#troubleshootingAccordion">
                        <div class="accordion-body">
                          <ul>
                            <li>Verify your SQL Server instance is running</li>
                            <li>Check server name, database name, username, and password are correct</li>
                            <li>Ensure your user has appropriate permissions on the database</li>
                            <li>Check if SQL Server is configured to accept remote connections</li>
                            <li>Verify firewall settings allow connections to SQL Server</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div class="accordion-item">
                      <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo">
                          Grid not loading data
                        </button>
                      </h2>
                      <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#troubleshootingAccordion">
                        <div class="accordion-body">
                          <ul>
                            <li>Click the refresh button (circular arrow icon)</li>
                            <li>Check your search filters and clear them if needed</li>
                            <li>Verify database connection is still active</li>
                            <li>Check browser console (F12) for error messages</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div class="accordion-item">
                      <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree">
                          Changes not saving
                        </button>
                      </h2>
                      <div id="collapseThree" class="accordion-collapse collapse" data-bs-parent="#troubleshootingAccordion">
                        <div class="accordion-body">
                          <ul>
                            <li>Ensure you have write permissions on the database</li>
                            <li>Check that required fields are filled in</li>
                            <li>Look for error messages in alerts or notifications</li>
                            <li>Try refreshing the grid after save to verify changes</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div class="accordion-item">
                      <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFour">
                          Application running slowly
                        </button>
                      </h2>
                      <div id="collapseFour" class="accordion-collapse collapse" data-bs-parent="#troubleshootingAccordion">
                        <div class="accordion-body">
                          <ul>
                            <li>Reduce items per page in Preferences</li>
                            <li>Use search and filters to narrow down results</li>
                            <li>Close unused tabs in the application</li>
                            <li>Restart the application</li>
                            <li>Check database server performance</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div class="accordion-item">
                      <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFive">
                          zzTakeoff Web not loading or stuck
                        </button>
                      </h2>
                      <div id="collapseFive" class="accordion-collapse collapse" data-bs-parent="#troubleshootingAccordion">
                        <div class="accordion-body">
                          <ul>
                            <li>Check your internet connection</li>
                            <li>Click the Reload button (circular arrow) in the toolbar</li>
                            <li>Click the "Login" button to navigate back to the login page</li>
                            <li>Exit and re-enter the zzTakeoff Web tab to recreate the browser view</li>
                            <li>Verify zzTakeoff.com is accessible in your regular browser</li>
                            <li>Check if you're logged out - session persistence saves your login, but it may expire</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div class="accordion-item">
                      <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseSix">
                          Can't exit fullscreen mode
                        </button>
                      </h2>
                      <div id="collapseSix" class="accordion-collapse collapse" data-bs-parent="#troubleshootingAccordion">
                        <div class="accordion-body">
                          <ul>
                            <li>Look for the "Exit Fullscreen" button at the top of the screen</li>
                            <li>Click "Back to [Tab Name]" to return to a tab</li>
                            <li>Use the Tabs menu (Ctrl+1 through Ctrl+9) to navigate to a different tab</li>
                            <li>Press Alt+F4 to close and reopen the application if the UI is not responding</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- Version Info -->
                <section class="mb-5">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-info-square me-2"></i>
                    Version Information
                  </h4>
                  <p>
                    <strong>Application:</strong> DBx Connector Vue (Electron Edition)<br>
                    <strong>Version:</strong> 1.0.3<br>
                    <strong>Tech Stack:</strong> Electron, Vue 3, AG Grid, Bootstrap 5<br>
                    <strong>Database:</strong> SQL Server (Databuild)
                  </p>
                </section>

                <!-- Support -->
                <section class="mb-4">
                  <h4 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-headset me-2"></i>
                    Support
                  </h4>
                  <p>
                    For technical support or to report issues, please contact your system administrator
                    or refer to your organization's IT support documentation.
                  </p>
                </section>

              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
            <i class="bi bi-x-lg me-1"></i>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Modal } from 'bootstrap';

// Modal ref
const modalRef = ref(null);
let modalInstance = null;

// Show modal
const show = () => {
  if (modalInstance) {
    modalInstance.show();
  }
};

// Expose methods
defineExpose({
  show
});

onMounted(() => {
  if (modalRef.value) {
    modalInstance = new Modal(modalRef.value);
  }
});
</script>

<style scoped>
.modal-content {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.modal-header,
.modal-footer {
  border-color: var(--border-color);
}

h4 {
  color: var(--text-primary);
  margin-top: 1rem;
}

p,
li {
  color: var(--text-primary);
  line-height: 1.6;
}

ul,
ol {
  margin-left: 1.5rem;
}

kbd {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 0.875rem;
  font-family: monospace;
}

/* Dark mode styles */
[data-theme="dark"] .modal-content {
  background-color: var(--bg-secondary);
}

[data-theme="dark"] .table {
  color: var(--text-primary);
  border-color: var(--border-color);
}

[data-theme="dark"] .table thead th {
  background-color: var(--bg-tertiary);
  border-color: var(--border-color);
}

[data-theme="dark"] .table td {
  border-color: var(--border-color);
}

[data-theme="dark"] .accordion-item {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
}

[data-theme="dark"] .accordion-button {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

[data-theme="dark"] .accordion-button:not(.collapsed) {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

[data-theme="dark"] .accordion-body {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}
</style>
