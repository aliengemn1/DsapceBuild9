# DSpace 9 Advanced Search Feature

A comprehensive Advanced Search implementation for DSpace 9 with Angular UI, providing complex query building capabilities with multiple fields and operators.

## Features

- **Multi-row Search Builder**: Add/remove multiple search conditions with AND/OR logic
- **Field-specific Searching**: Search by Title, Author, Subject, Publisher, Language, Item Type, Date Issued, Abstract, Identifier
- **Multiple Operators**: Contains, Equals, Starts With, Not Contains, Not Equals
- **Date Range Support**: Search within date ranges with from/to selectors
- **Scope Selection**: Search globally or within specific Communities/Collections
- **Applied Filters Display**: Visual display of active search criteria with remove options
- **Performance Optimized**: Uses DSpace Discovery (Solr) for fast query execution
- **Responsive Design**: Works on desktop and mobile devices
- **RTL Support**: Ready for Arabic and other RTL languages

## Directory Structure

```
dspace-angular-advanced-search/
├── README.md                              # This file
├── INSTALLATION-GUIDE.md                  # Step-by-step installation guide
├── REST-API-EXAMPLES.md                   # REST API query examples
├── discovery-advanced-search-additions.xml # Backend discovery.xml additions
├── advanced-search.component.ts           # Main Angular component
├── advanced-search.component.html         # Component template
├── advanced-search.component.scss         # Component styles
├── advanced-search.service.ts             # REST API service
├── advanced-search.module.ts              # Angular module
└── advanced-search-routing.module.ts      # Routing configuration
```

## Quick Start

### 1. Backend Setup

Add the search filter beans from `discovery-advanced-search-additions.xml` to:
```
[dspace]/config/spring/api/discovery.xml
```

Reindex Solr:
```bash
./dspace index-discovery -b
```

### 2. Frontend Setup

Copy Angular files to:
```
dspace-angular/src/app/advanced-search/
```

Add route to `app-routing.module.ts`:
```typescript
{
  path: 'advanced-search',
  loadChildren: () => import('./advanced-search/advanced-search.module')
    .then(m => m.AdvancedSearchModule)
}
```

Build and deploy:
```bash
npm run build:prod
```

## Metadata Field Mapping

| UI Field | Metadata Field | Solr Index Field |
|----------|---------------|------------------|
| Title | dc.title | title |
| Author | dc.contributor.author | author |
| Subject | dc.subject | subject |
| Publisher | dc.publisher | publisher |
| Language | dc.language.iso | language |
| Item Type | dc.type | itemtype |
| Date Issued | dc.date.issued | dateIssued |
| Abstract | dc.description.abstract | abstract |
| Identifier | dc.identifier.* | identifier |

## Supported Operators

| Operator | Description | REST API Value |
|----------|-------------|----------------|
| Contains | Partial match anywhere | `contains` |
| Equals | Exact match | `equals` |
| Starts With | Prefix match | `query` |
| Not Contains | Excludes partial match | `notcontains` |
| Not Equals | Excludes exact match | `notequals` |

## REST API Usage

### Basic Search
```bash
GET /api/discover/search/objects?query=machine%20learning
```

### Field-specific Search with Filter
```bash
GET /api/discover/search/objects?query=machine%20learning&f.author=Smith,contains
```

### Date Range Search
```bash
GET /api/discover/search/objects?query=dc.date.issued:[2020-01-01T00:00:00Z%20TO%202023-12-31T23:59:59Z]
```

### Combined Advanced Search
```bash
GET /api/discover/search/objects?query=(dc.title:*machine*%20AND%20dc.contributor.author:*Smith*)&f.itemtype=Article,equals&f.dateIssued=[2020%20TO%202023],equals&page=0&size=20
```

See [REST-API-EXAMPLES.md](REST-API-EXAMPLES.md) for comprehensive examples.

## Configuration

### Discovery Configuration

The advanced search uses the following discovery configuration options:

- `sidebarFacets`: Facets shown in search result sidebar
- `searchFilters`: Available search filter fields
- `searchSortConfiguration`: Sort options for results
- `hitHighlightingConfiguration`: Hit highlighting settings
- `spellCheckEnabled`: Enable "Did you mean" suggestions

### Angular Environment

Configure the REST API base URL in environment files:

```typescript
// environment.ts
export const environment = {
  rest: {
    baseUrl: 'http://localhost:8080/server'
  }
};
```

## Customization

### Adding New Search Fields

1. Add metadata field to `discovery.xml`:
```xml
<bean id="searchFilterNewField" class="org.dspace.discovery.configuration.DiscoverySearchFilterFacet">
    <property name="indexFieldName" value="newfield"/>
    <property name="metadataFields">
        <list>
            <value>dc.new.field</value>
        </list>
    </property>
    ...
</bean>
```

2. Add to Angular component `metadataFields` array:
```typescript
{ label: 'New Field', value: 'newfield', solrField: 'dc.new.field', type: 'text' }
```

3. Add to service `METADATA_FIELD_MAPPING`:
```typescript
'newfield': 'newfield'
```

### Styling

Override styles in `advanced-search.component.scss` or your theme's SCSS files.

## Performance Considerations

1. **Use Filters Over Query Strings**: Filters are cached by Solr
2. **Avoid Leading Wildcards**: `term*` is faster than `*term`
3. **Reasonable Page Sizes**: Keep between 10-50 results per page
4. **Index Optimization**: Run `dspace index-discovery -o` periodically

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- IE 11 (with polyfills)

## License

This implementation follows the DSpace BSD License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

- DSpace Wiki: https://wiki.lyrasis.org/display/DSDOC9x
- DSpace Community: https://dspace.org/community
- GitHub Issues: https://github.com/DSpace/DSpace/issues
