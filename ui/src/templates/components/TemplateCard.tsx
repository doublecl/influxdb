// Libraries
import React, {PureComponent, MouseEvent} from 'react'
import {connect} from 'react-redux'
import {withRouter, WithRouterProps} from 'react-router'

// Components
import {ResourceList, Context, IconFont} from 'src/clockface'
import InlineLabels from 'src/shared/components/inlineLabels/InlineLabels'

// Actions
import {
  deleteTemplate,
  cloneTemplate,
  updateTemplate,
  addTemplateLabelsAsync,
  removeTemplateLabelsAsync,
} from 'src/templates/actions'
import {createLabel as createLabelAsync} from 'src/labels/actions'

// Selectors
import {viewableLabels} from 'src/labels/selectors'

// Types
import {TemplateSummary, ILabel} from '@influxdata/influx'
import {ComponentColor} from '@influxdata/clockface'
import {AppState} from 'src/types'

// Constants
import {DEFAULT_TEMPLATE_NAME} from 'src/templates/constants'

interface OwnProps {
  template: TemplateSummary
  onFilterChange: (searchTerm: string) => void
}

interface DispatchProps {
  onDelete: typeof deleteTemplate
  onClone: typeof cloneTemplate
  onUpdate: typeof updateTemplate
  onCreateLabel: typeof createLabelAsync
  onAddLabels: typeof addTemplateLabelsAsync
  onRemoveLabels: typeof removeTemplateLabelsAsync
}

interface StateProps {
  labels: ILabel[]
}

type Props = DispatchProps & OwnProps & StateProps

export class TemplateCard extends PureComponent<Props & WithRouterProps> {
  public render() {
    const {template, labels, onFilterChange} = this.props

    return (
      <ResourceList.Card
        testID="template-card"
        contextMenu={() => this.contextMenu}
        name={() => (
          <ResourceList.Name
            onClick={this.handleNameClick}
            onUpdate={this.handleUpdateTemplate}
            name={template.meta.name}
            noNameString={DEFAULT_TEMPLATE_NAME}
            parentTestID="template-card--name"
            buttonTestID="template-card--name-button"
            inputTestID="template-card--input"
          />
        )}
        labels={() => (
          <InlineLabels
            selectedLabels={template.labels}
            labels={labels}
            onFilterChange={onFilterChange}
            onAddLabel={this.handleAddLabel}
            onRemoveLabel={this.handleRemoveLabel}
            onCreateLabel={this.handleCreateLabel}
          />
        )}
      />
    )
  }

  private handleAddLabel = (label: ILabel) => {
    const {onAddLabels, template} = this.props

    onAddLabels(template.id, [label])
  }

  private handleRemoveLabel = (label: ILabel) => {
    const {onRemoveLabels, template} = this.props

    onRemoveLabels(template.id, [label])
  }

  private handleCreateLabel = async (label: ILabel): Promise<void> => {
    try {
      await this.props.onCreateLabel(label.orgID, label.name, label.properties)

      // notify success
    } catch (err) {
      console.error(err)
      // notify of fail
      throw err
    }
  }

  private handleUpdateTemplate = (name: string) => {
    const {template} = this.props

    this.props.onUpdate(template.id, {
      ...template,
      meta: {...template.meta, name},
    })
  }

  private get contextMenu(): JSX.Element {
    const {
      template: {id},
      onDelete,
    } = this.props
    return (
      <Context>
        <Context.Menu
          icon={IconFont.Duplicate}
          color={ComponentColor.Secondary}
        >
          <Context.Item label="Clone" action={this.handleClone} value={id} />
        </Context.Menu>
        <Context.Menu
          icon={IconFont.Trash}
          color={ComponentColor.Danger}
          testID="context-delete-menu"
        >
          <Context.Item
            label="Delete"
            action={onDelete}
            value={id}
            testID="context-delete-task"
          />
        </Context.Menu>
      </Context>
    )
  }

  private handleClone = () => {
    const {
      template: {id},
      params: {orgID},
      onClone,
    } = this.props
    onClone(id, orgID)
  }

  private handleNameClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    this.handleExport()
  }

  private handleExport = () => {
    const {
      router,
      template,
      params: {orgID},
    } = this.props
    router.push(`organizations/${orgID}/templates/${template.id}/export`)
  }
}

const mstp = ({labels}: AppState): StateProps => {
  return {
    labels: viewableLabels(labels.list),
  }
}

const mdtp: DispatchProps = {
  onDelete: deleteTemplate,
  onClone: cloneTemplate,
  onUpdate: updateTemplate,
  onCreateLabel: createLabelAsync,
  onAddLabels: addTemplateLabelsAsync,
  onRemoveLabels: removeTemplateLabelsAsync,
}

export default connect<{}, DispatchProps, OwnProps>(
  mstp,
  mdtp
)(withRouter<Props>(TemplateCard))
