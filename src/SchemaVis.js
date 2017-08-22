// @flow
import React, { Component } from 'react';
import { has, get, merge, omit, isEmpty, isFunction, isArray } from 'lodash';

import {
  DEFAULT_PREFIX,
  isDisabled,
  getOrdinal,
  hasOrdinal,
  getComponent,
  hasComponent,
  getStyle
} from './selectors';

const LABEL_PROP = 'title';

function _compare(obj: { [name: string]: any }, prefix: string) {
  return (a, b) => {
    if (hasOrdinal(obj[a], prefix)) {
      if (hasOrdinal(obj[b], prefix)) {
        const aOrdinal = getOrdinal(obj[a], prefix);
        const bOrdinal = getOrdinal(obj[b], prefix);
        return aOrdinal - bOrdinal;
      }
      return 1;
    }
    if (hasOrdinal(obj[b], prefix)) {
      return -1;
    }

    const vA = get(obj[a], LABEL_PROP, a);
    const vB = get(obj[b], LABEL_PROP, b);
    return +(vA > vB) || +(vA === vB) - 1;
  };
}

function isRequired(schema: SchemaType, key: string) {
  return schema.required && schema.required.includes(key);
}

function getDefaultComponent(defaultComponents, schema = {}) {
  if (defaultComponents && isArray(defaultComponents)) {
    const comps = defaultComponents.map(comp => isFunction(comp) ? comp(schema) : (comp.type === schema.type) && schema.component);
    return !isEmpty(comps) && comps[0];
  } else if (defaultComponents) {
    return defaultComponents[schema.type];
  }

  return undefined;
}

export default class SchemaVis extends Component {
  static defaultProps = {
    styles: {},
    prefix: DEFAULT_PREFIX,
    tag: 'div',
    id: 'schemaVis'
  };

  props: {
    schema: SchemaType,
    id: string,
    prefix: string,
    namespace?: string,
    styles: SchemaVisStylesType,
    components: { [string]: React.Element<*> | string
},
defaultComponents: Array < any >,
  componentProps: { [string]: { styles: { [string]: any } } },
tag: string
  };

renderChildren = (schema: SchemaType, namespace?: string) => {
  const { prefix } = this.props;
  const children = schema.type === 'object' && schema.properties
    ? schema.properties
    : {};
  return Object.keys(children)
    .filter(prop => !isDisabled(children[prop], prefix))
    .sort(_compare(children, prefix))
    .map((prop, idx) =>
      this.renderSchema(
        children[prop],
        idx,
        namespace ? `${namespace}.${prop}` : prop,
        isRequired(schema, prop)
      )
    );
};

renderSchema = (
  schema: SchemaType,
  idx: number | string,
  name?: string,
  required: boolean = false
) => {
  const {
      styles: { component: componentStyles = {} },
    components,
    componentProps,
    prefix,
    tag: Tag,
    defaultComponents
    } = this.props;

  const schemaStyle = getStyle(schema, prefix, {});
  const component = getComponent(schema, prefix);
  const rest = omit(this.props, [
    'schema',
    'prefix',
    'styles',
    'namespace',
    'components',
    'componentProps',
    'defaultComponents',
    'tag'
  ]);

  const ComponentVis = get(
    components,
    component,
    getDefaultComponent(defaultComponents, schema)
  );

  if (ComponentVis) {
    const { styles: componentPropStyles = {}, ...componentProp } = get(
      componentProps,
      component,
      {}
    );

    const componentAttributes = {
      styles: merge({}, componentStyles, componentPropStyles, schemaStyle),
      key: idx,
      name,
      required,
      schemaVis: {
        prefix,
        schema,
        components,
        componentProps,
        defaultComponents
      },
      ...componentProp,
      ...rest
    };

    if (React.isValidElement(ComponentVis)) {
      return React.cloneElement(ComponentVis, componentAttributes);
    }

    return React.createElement(ComponentVis, componentAttributes);
  } else if (!isEmpty(get(schema, 'properties', []))) {
    return React.createElement(
      Tag,
      { key: idx, ...rest },
      this.renderChildren(schema, name)
    );
  }

  return undefined;
};

render() {
  const { schema, namespace, id } = this.props;

  return this.renderSchema(schema, id, namespace) || <div />;
}
}
