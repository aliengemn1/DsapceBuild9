# DSpace 9 REST API - Advanced Search Examples

This document provides comprehensive examples of how to use the DSpace 9 REST API for advanced searching.

## Base URL

All examples assume the following base URL:
```
http://localhost:8080/server/api/discover/search/objects
```

---

## 1. Basic Search Queries

### 1.1 Simple Keyword Search (All Fields)
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate%20change"
```

### 1.2 Search with Pagination
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate&page=0&size=20"
```

### 1.3 Search with Sorting
```bash
# Sort by date issued, descending
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate&sort=dc.date.issued,DESC"

# Sort by title, ascending
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate&sort=dc.title,ASC"

# Sort by relevance score
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate&sort=score,DESC"
```

---

## 2. Field-Specific Searches

### 2.1 Search by Title
```bash
# Contains "machine learning" in title
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.title:*machine%20learning*"

# Exact title match
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.title:\"Introduction%20to%20Machine%20Learning\""

# Title starts with
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.title:Introduction*"
```

### 2.2 Search by Author
```bash
# Author contains "Smith"
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.contributor.author:*Smith*"

# Exact author match
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.contributor.author:\"John%20Smith\""

# Using filter parameter (recommended)
curl -X GET "http://localhost:8080/server/api/discover/search/objects?f.author=Smith,contains"
```

### 2.3 Search by Subject/Keywords
```bash
# Subject contains "artificial intelligence"
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.subject:*artificial%20intelligence*"

# Using filter parameter
curl -X GET "http://localhost:8080/server/api/discover/search/objects?f.subject=artificial%20intelligence,contains"
```

### 2.4 Search by Publisher
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?f.publisher=Springer,contains"
```

### 2.5 Search by Language
```bash
# English items only
curl -X GET "http://localhost:8080/server/api/discover/search/objects?f.language=en,equals"

# Arabic items
curl -X GET "http://localhost:8080/server/api/discover/search/objects?f.language=ar,equals"
```

### 2.6 Search by Item Type
```bash
# Find all articles
curl -X GET "http://localhost:8080/server/api/discover/search/objects?f.itemtype=Article,equals"

# Find all theses
curl -X GET "http://localhost:8080/server/api/discover/search/objects?f.itemtype=Thesis,equals"
```

---

## 3. Date Range Searches

### 3.1 Items Published in a Specific Year
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.date.issued:[2023-01-01T00:00:00Z%20TO%202023-12-31T23:59:59Z]"
```

### 3.2 Items Published After a Date
```bash
# Items from 2020 onwards
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.date.issued:[2020-01-01T00:00:00Z%20TO%20*]"
```

### 3.3 Items Published Before a Date
```bash
# Items before 2000
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.date.issued:[*%20TO%201999-12-31T23:59:59Z]"
```

### 3.4 Using Filter Parameter for Date Ranges
```bash
# Using the dateIssued filter
curl -X GET "http://localhost:8080/server/api/discover/search/objects?f.dateIssued=[2020%20TO%202023],equals"
```

---

## 4. Combined Field + Facet Filtering

### 4.1 Keyword Search with Author Filter
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=machine%20learning&f.author=Smith,contains"
```

### 4.2 Multiple Filters Combined
```bash
# Find articles by Smith about machine learning published after 2020
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=machine%20learning&f.author=Smith,contains&f.itemtype=Article,equals&f.dateIssued=[2020%20TO%20*],equals"
```

### 4.3 Title Search with Subject and Date Filters
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.title:*climate*&f.subject=environment,contains&f.dateIssued=[2018%20TO%202023],equals"
```

---

## 5. Boolean Operators in Queries

### 5.1 AND Queries
```bash
# Both terms must be present
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=machine%20AND%20learning"

# Field-specific AND
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.title:machine%20AND%20dc.title:learning"
```

### 5.2 OR Queries
```bash
# Either term
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=machine%20OR%20artificial"

# Multiple authors
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=dc.contributor.author:Smith%20OR%20dc.contributor.author:Jones"
```

### 5.3 NOT Queries
```bash
# Exclude specific terms
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=machine%20learning%20NOT%20deep%20learning"

# Exclude specific author
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=machine%20learning%20-dc.contributor.author:Smith"
```

### 5.4 Complex Boolean Queries
```bash
# Complex query with grouping
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=(machine%20OR%20artificial)%20AND%20learning%20AND%20dc.date.issued:[2020%20TO%20*]"
```

---

## 6. Scope-Specific Searches

### 6.1 Search Within a Community
```bash
# Replace {community-uuid} with actual UUID
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate&scope={community-uuid}"
```

### 6.2 Search Within a Collection
```bash
# Replace {collection-uuid} with actual UUID
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate&scope={collection-uuid}"
```

### 6.3 Global Search (No Scope)
```bash
# Omit scope parameter for global search
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate"
```

---

## 7. Filter Operators Reference

The DSpace REST API supports the following operators for the `f.<field>=<value>,<operator>` format:

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match | `f.author=John%20Smith,equals` |
| `notequals` | Not equal to | `f.author=John%20Smith,notequals` |
| `contains` | Contains substring | `f.title=machine,contains` |
| `notcontains` | Does not contain | `f.title=test,notcontains` |
| `authority` | Match by authority key | `f.author=uuid-123,authority` |
| `notauthority` | Not match authority | `f.author=uuid-123,notauthority` |
| `query` | Partial/prefix match | `f.title=intro,query` |

---

## 8. DSO Type Filtering

### 8.1 Search Only Items
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate&dsoType=ITEM"
```

### 8.2 Search Communities and Collections
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=science&dsoType=COMMUNITY&dsoType=COLLECTION"
```

### 8.3 Search All Types
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=research"
```

---

## 9. Using Different Configurations

### 9.1 Default Configuration
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate&configuration=default"
```

### 9.2 Advanced Search Configuration
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate&configuration=advanced"
```

### 9.3 Community-Specific Configuration
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=climate&configuration=community"
```

---

## 10. Facet Queries

### 10.1 Get Available Facets
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/facets?query=climate"
```

### 10.2 Get Specific Facet Values
```bash
# Get author facet values
curl -X GET "http://localhost:8080/server/api/discover/facets/author?query=climate"

# Get subject facet values with prefix filter
curl -X GET "http://localhost:8080/server/api/discover/facets/subject?prefix=env"
```

### 10.3 Facet Values with Pagination
```bash
curl -X GET "http://localhost:8080/server/api/discover/facets/author?query=climate&page=0&size=50"
```

---

## 11. Advanced Query Examples

### 11.1 Full Advanced Search Query
```bash
# Find English articles about machine learning by Smith or Jones, published 2020-2023
curl -X GET "http://localhost:8080/server/api/discover/search/objects?\
query=(dc.title:*machine%20learning*%20OR%20dc.description.abstract:*machine%20learning*)%20AND%20(dc.contributor.author:*Smith*%20OR%20dc.contributor.author:*Jones*)\
&f.language=en,equals\
&f.itemtype=Article,equals\
&f.dateIssued=[2020%20TO%202023],equals\
&page=0\
&size=20\
&sort=dc.date.issued,DESC"
```

### 11.2 Search with Hit Highlighting
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=machine%20learning&highlight=true"
```

### 11.3 Search with Spell Check Suggestions
```bash
curl -X GET "http://localhost:8080/server/api/discover/search/objects?query=machin%20lerning"
# Response will include "Did you mean: machine learning"
```

---

## 12. Response Format

### Typical Response Structure
```json
{
  "_embedded": {
    "searchResult": {
      "_embedded": {
        "objects": [
          {
            "_embedded": {
              "indexableObject": {
                "uuid": "item-uuid",
                "name": "Item Title",
                "metadata": {
                  "dc.title": [{"value": "Item Title"}],
                  "dc.contributor.author": [{"value": "Author Name"}],
                  "dc.date.issued": [{"value": "2023"}]
                }
              }
            },
            "hitHighlights": {
              "dc.title": ["<em>Machine</em> <em>Learning</em> Basics"]
            }
          }
        ]
      },
      "page": {
        "size": 20,
        "totalElements": 150,
        "totalPages": 8,
        "number": 0
      }
    },
    "facets": [
      {
        "name": "author",
        "_embedded": {
          "values": [
            {"label": "Smith, John", "count": 25},
            {"label": "Jones, Jane", "count": 18}
          ]
        }
      }
    ]
  },
  "_links": {
    "self": {"href": "..."},
    "next": {"href": "..."},
    "prev": {"href": "..."}
  }
}
```

---

## 13. Error Handling

### Common Error Responses

**400 Bad Request** - Invalid query syntax
```json
{
  "error": "Invalid query syntax",
  "message": "Unbalanced parentheses in query"
}
```

**422 Unprocessable Entity** - Solr parse error
```json
{
  "error": "org.apache.solr.search.SyntaxError",
  "message": "Cannot parse query"
}
```

---

## 14. Performance Tips

1. **Use filters instead of query strings** when possible - filters are cached by Solr
2. **Limit result size** - use pagination with reasonable page sizes (10-50)
3. **Use specific field queries** - searching `dc.title:term` is faster than `*:term`
4. **Avoid leading wildcards** - `term*` is faster than `*term`
5. **Use date ranges with ISO format** - `[2020-01-01T00:00:00Z TO *]`

---

## 15. cURL Examples with Full Headers

### Complete Example with Authentication (if needed)
```bash
curl -X GET \
  "http://localhost:8080/server/api/discover/search/objects?query=climate" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json"
```

### Example with Bearer Token (for authenticated endpoints)
```bash
curl -X GET \
  "http://localhost:8080/server/api/discover/search/objects?query=climate" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
