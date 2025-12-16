# DSpace 9 Advanced Search - Installation Guide

This guide provides step-by-step instructions for installing the Advanced Search feature in DSpace 9.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Backend Configuration (DSpace Server)](#2-backend-configuration-dspace-server)
3. [Angular Frontend Installation](#3-angular-frontend-installation)
4. [Build and Deploy](#4-build-and-deploy)
5. [Testing](#5-testing)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Prerequisites

### Required Software
- Java 17 or 21 (for DSpace 9)
- Node.js 18+ and npm
- Maven 3.8+
- PostgreSQL 13+
- Apache Solr 9.x (bundled with DSpace)
- Apache Tomcat 9/10 or embedded server

### DSpace Versions
- DSpace Backend: 9.x
- DSpace Angular: 9.x

---

## 2. Backend Configuration (DSpace Server)

### Step 2.1: Update discovery.xml

Edit the file: `[dspace-source]/dspace/config/spring/api/discovery.xml`

#### Add Search Filter Beans

Add these beans before the `</beans>` closing tag:

```xml
<!-- Publisher Search Filter -->
<bean id="searchFilterPublisher" class="org.dspace.discovery.configuration.DiscoverySearchFilterFacet">
    <property name="indexFieldName" value="publisher"/>
    <property name="metadataFields">
        <list>
            <value>dc.publisher</value>
        </list>
    </property>
    <property name="facetLimit" value="10"/>
    <property name="sortOrderSidebar" value="COUNT"/>
    <property name="sortOrderFilterPage" value="COUNT"/>
    <property name="isOpenByDefault" value="false"/>
    <property name="pageSize" value="10"/>
</bean>

<!-- Language Search Filter -->
<bean id="searchFilterLanguage" class="org.dspace.discovery.configuration.DiscoverySearchFilterFacet">
    <property name="indexFieldName" value="language"/>
    <property name="metadataFields">
        <list>
            <value>dc.language</value>
            <value>dc.language.iso</value>
        </list>
    </property>
    <property name="facetLimit" value="10"/>
    <property name="sortOrderSidebar" value="COUNT"/>
    <property name="sortOrderFilterPage" value="COUNT"/>
    <property name="isOpenByDefault" value="false"/>
    <property name="pageSize" value="10"/>
</bean>

<!-- Item Type Search Filter -->
<bean id="searchFilterItemType" class="org.dspace.discovery.configuration.DiscoverySearchFilterFacet">
    <property name="indexFieldName" value="itemtype"/>
    <property name="metadataFields">
        <list>
            <value>dc.type</value>
        </list>
    </property>
    <property name="facetLimit" value="10"/>
    <property name="sortOrderSidebar" value="COUNT"/>
    <property name="sortOrderFilterPage" value="COUNT"/>
    <property name="isOpenByDefault" value="true"/>
    <property name="pageSize" value="10"/>
</bean>

<!-- Abstract/Description Search Filter -->
<bean id="searchFilterAbstract" class="org.dspace.discovery.configuration.DiscoverySearchFilter">
    <property name="indexFieldName" value="abstract"/>
    <property name="metadataFields">
        <list>
            <value>dc.description.abstract</value>
            <value>dc.description</value>
        </list>
    </property>
    <property name="isOpenByDefault" value="false"/>
    <property name="pageSize" value="10"/>
</bean>

<!-- Identifier Search Filter -->
<bean id="searchFilterIdentifier" class="org.dspace.discovery.configuration.DiscoverySearchFilter">
    <property name="indexFieldName" value="identifier"/>
    <property name="metadataFields">
        <list>
            <value>dc.identifier</value>
            <value>dc.identifier.doi</value>
            <value>dc.identifier.isbn</value>
            <value>dc.identifier.issn</value>
            <value>dc.identifier.uri</value>
        </list>
    </property>
    <property name="isOpenByDefault" value="false"/>
    <property name="pageSize" value="10"/>
</bean>
```

#### Add Filter References to Default Configuration

Find the `defaultConfiguration` bean and add the new filter references:

```xml
<bean id="defaultConfiguration" class="org.dspace.discovery.configuration.DiscoveryConfiguration" scope="prototype">
    <!-- In sidebarFacets list, add: -->
    <property name="sidebarFacets">
        <list>
            <!-- existing filters... -->
            <ref bean="searchFilterPublisher" />
            <ref bean="searchFilterLanguage" />
            <ref bean="searchFilterItemType" />
        </list>
    </property>

    <!-- In searchFilters list, add: -->
    <property name="searchFilters">
        <list>
            <!-- existing filters... -->
            <ref bean="searchFilterPublisher" />
            <ref bean="searchFilterLanguage" />
            <ref bean="searchFilterItemType" />
            <ref bean="searchFilterAbstract" />
            <ref bean="searchFilterIdentifier" />
        </list>
    </property>
</bean>
```

#### Register Advanced Search Configuration (Optional)

Add to the configuration map:

```xml
<bean id="org.dspace.discovery.configuration.DiscoveryConfigurationService" ...>
    <property name="map">
        <map>
            <!-- existing entries... -->
            <entry key="advanced" value-ref="advancedSearchConfiguration"/>
        </map>
    </property>
</bean>
```

### Step 2.2: Build the Backend

```bash
cd [dspace-source]

# Clean and build
mvn clean package -Dmirage2.on=true -P!dspace-sword -P!dspace-swordv2 -P!dspace-oai

# Install
cd dspace/target/dspace-installer
ant fresh_install
# OR for update:
ant update
```

### Step 2.3: Reindex Solr

```bash
cd [dspace-install]/bin

# Full reindex (recommended after configuration changes)
./dspace index-discovery -b

# Or optimize without full reindex
./dspace index-discovery -o
```

### Step 2.4: Restart DSpace

```bash
# If using Tomcat
sudo systemctl restart tomcat

# If using embedded server
cd [dspace-install]
./bin/dspace server start
```

---

## 3. Angular Frontend Installation

### Step 3.1: Copy Component Files

Copy the following files to your dspace-angular project:

```
dspace-angular/
└── src/
    └── app/
        └── advanced-search/
            ├── advanced-search.component.ts
            ├── advanced-search.component.html
            ├── advanced-search.component.scss
            ├── advanced-search.service.ts
            ├── advanced-search.module.ts
            └── advanced-search-routing.module.ts
```

### Step 3.2: Register the Module

Edit `src/app/app-routing.module.ts`:

```typescript
const routes: Routes = [
  // ... existing routes
  {
    path: 'advanced-search',
    loadChildren: () => import('./advanced-search/advanced-search.module')
      .then(m => m.AdvancedSearchModule)
  },
];
```

### Step 3.3: Update Environment Configuration

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  rest: {
    baseUrl: 'http://localhost:8080/server'
  }
};
```

And `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  rest: {
    baseUrl: '/server'  // Or your production server URL
  }
};
```

### Step 3.4: Add Navigation Link

Edit your header/navigation component to add a link:

```html
<!-- In header.component.html or navigation.component.html -->
<a routerLink="/advanced-search" class="nav-link">Advanced Search</a>
```

### Step 3.5: Add i18n Translations (Optional)

Edit `src/assets/i18n/en.json5`:

```json5
{
  "advanced-search": {
    "title": "Advanced Search",
    "description": "Build complex queries to find exactly what you're looking for.",
    "fields": {
      "title": "Title",
      "author": "Author",
      "subject": "Subject",
      "publisher": "Publisher",
      "language": "Language",
      "itemtype": "Item Type",
      "dateIssued": "Date Issued",
      "abstract": "Abstract",
      "identifier": "Identifier",
      "allFields": "All Fields"
    },
    "operators": {
      "contains": "Contains",
      "equals": "Equals",
      "startsWith": "Starts With",
      "notContains": "Not Contains",
      "notEquals": "Not Equals"
    },
    "buttons": {
      "search": "Search",
      "reset": "Reset",
      "addRow": "Add Search Row"
    }
  }
}
```

---

## 4. Build and Deploy

### Build Angular Frontend

```bash
cd [dspace-angular]

# Install dependencies
npm install

# Development build
npm run build

# Production build
npm run build:prod

# Or with specific base href
npm run build:prod -- --base-href=/
```

### Deploy to Server

```bash
# Copy dist folder to web server
cp -r dist/browser/* /var/www/dspace-angular/

# Or if using Nginx
cp -r dist/browser/* /usr/share/nginx/html/
```

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name your-dspace-domain.com;

    root /var/www/dspace-angular;
    index index.html;

    # Angular routing support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to DSpace backend
    location /server/ {
        proxy_pass http://localhost:8080/server/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 5. Testing

### Test Backend API

```bash
# Test search endpoint
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=test"

# Test with filter
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=test&f.author=Smith,contains"

# Test facets
curl -X GET "http://localhost:8080/server/api/discover/facets/author"
```

### Test Frontend

1. Navigate to `http://localhost:4000/advanced-search`
2. Add search rows with different fields and operators
3. Execute search and verify results
4. Test pagination
5. Test filter removal
6. Test scope selection (if communities/collections exist)

### Automated Tests

```bash
# Run Angular tests
npm run test

# Run e2e tests
npm run e2e
```

---

## 6. Troubleshooting

### Common Issues

#### Search Returns No Results

1. Verify Solr is running:
   ```bash
   curl http://localhost:8983/solr/search/admin/ping
   ```

2. Check if items are indexed:
   ```bash
   ./dspace index-discovery -b
   ```

3. Verify filter configuration in discovery.xml

#### 422 Unprocessable Entity Error

- Check query syntax for unbalanced parentheses
- Verify field names are correctly mapped
- Check for special characters that need escaping

#### CORS Errors

Add to DSpace `local.cfg`:
```properties
rest.cors.allowed-origins = http://localhost:4000
```

Or configure in Nginx:
```nginx
add_header 'Access-Control-Allow-Origin' '*';
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
add_header 'Access-Control-Allow-Headers' 'Authorization,Content-Type';
```

#### Filters Not Appearing

1. Verify bean is defined in discovery.xml
2. Check bean is added to searchFilters list
3. Restart DSpace after changes
4. Reindex: `./dspace index-discovery -b`

#### Date Range Search Not Working

- Ensure dates are in ISO format: `YYYY-MM-DDTHH:MM:SSZ`
- Verify dateIssued filter is configured
- Check Solr schema includes date field type

### Log Files

- DSpace logs: `[dspace-install]/log/dspace.log`
- Solr logs: `[solr]/logs/solr.log`
- Tomcat logs: `[tomcat]/logs/catalina.out`
- Angular dev logs: Browser console

### Getting Help

- DSpace Wiki: https://wiki.lyrasis.org/display/DSDOC9x
- DSpace Slack: https://dspace-org.slack.com
- GitHub Issues: https://github.com/DSpace/DSpace/issues

---

## Quick Reference Commands

```bash
# Rebuild backend
cd [dspace-source] && mvn clean package && cd dspace/target/dspace-installer && ant update

# Reindex Solr
[dspace-install]/bin/dspace index-discovery -b

# Restart DSpace (systemd)
sudo systemctl restart tomcat

# Rebuild Angular
cd [dspace-angular] && npm run build:prod

# Check DSpace status
curl http://localhost:8080/server/api

# Check Solr status
curl http://localhost:8983/solr/search/admin/ping
```
