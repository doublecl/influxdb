// Libraries
import React, {PureComponent, ChangeEvent} from 'react'
import _ from 'lodash'

// Components
import {Input, Button, EmptyState} from '@influxdata/clockface'
import {Overlay, Tabs} from 'src/clockface'
import FilterList from 'src/shared/components/Filter'
import BucketList from 'src/organizations/components/BucketList'
import {PrettyBucket} from 'src/organizations/components/BucketRow'
import CreateBucketOverlay from 'src/organizations/components/CreateBucketOverlay'

// Actions
import * as NotificationsActions from 'src/types/actions/notifications'

// Utils
import {ruleToString} from 'src/utils/formatting'

// APIs
import {client} from 'src/utils/api'

// Types
import {Bucket, Organization, BucketRetentionRules} from '@influxdata/influx'
import {IconFont, ComponentSize, ComponentColor} from '@influxdata/clockface'
import {OverlayState} from 'src/types'

interface Props {
  org: Organization
  buckets: Bucket[]
  onChange: () => void
  notify: NotificationsActions.PublishNotificationActionCreator
}

interface State {
  buckets: PrettyBucket[]
  searchTerm: string
  overlayState: OverlayState
}

// Decorators
import {ErrorHandling} from 'src/shared/decorators/errors'
import {
  bucketDeleteSuccess,
  bucketDeleteFailed,
  bucketCreateFailed,
  bucketCreateSuccess,
  bucketUpdateFailed,
  bucketUpdateSuccess,
} from 'src/shared/copy/v2/notifications'

@ErrorHandling
export default class Buckets extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      searchTerm: '',
      overlayState: OverlayState.Closed,
      buckets: this.prettyBuckets(this.props.buckets),
    }
  }

  public render() {
    const {org, buckets} = this.props
    const {searchTerm, overlayState} = this.state

    return (
      <>
        <Tabs.TabContentsHeader>
          <Input
            icon={IconFont.Search}
            placeholder="Filter buckets..."
            widthPixels={290}
            value={searchTerm}
            onChange={this.handleFilterChange}
            onBlur={this.handleFilterBlur}
          />
          <Button
            text="Create Bucket"
            icon={IconFont.Plus}
            color={ComponentColor.Primary}
            onClick={this.handleOpenModal}
          />
        </Tabs.TabContentsHeader>
        <FilterList<PrettyBucket>
          searchTerm={searchTerm}
          searchKeys={['name', 'ruleString', 'labels[].name']}
          list={this.prettyBuckets(buckets)}
        >
          {bs => (
            <BucketList
              buckets={bs}
              emptyState={this.emptyState}
              onUpdateBucket={this.handleUpdateBucket}
              onDeleteBucket={this.handleDeleteBucket}
              onFilterChange={this.handleFilterUpdate}
            />
          )}
        </FilterList>
        <Overlay visible={overlayState === OverlayState.Open}>
          <CreateBucketOverlay
            org={org}
            onCloseModal={this.handleCloseModal}
            onCreateBucket={this.handleCreateBucket}
          />
        </Overlay>
      </>
    )
  }

  private handleUpdateBucket = async (updatedBucket: PrettyBucket) => {
    const {onChange, notify} = this.props
    try {
      await client.buckets.update(updatedBucket.id, updatedBucket)
      onChange()
      notify(bucketUpdateSuccess(updatedBucket.name))
    } catch (e) {
      console.error(e)
      notify(bucketUpdateFailed(updatedBucket.name))
    }
  }

  private handleDeleteBucket = async (deletedBucket: PrettyBucket) => {
    const {onChange, notify} = this.props
    try {
      await client.buckets.delete(deletedBucket.id)
      onChange()
      notify(bucketDeleteSuccess(deletedBucket.name))
    } catch (e) {
      console.error(e)
      bucketDeleteFailed(deletedBucket.name)
    }
  }

  private handleCreateBucket = async (bucket: Bucket): Promise<void> => {
    const {onChange, notify} = this.props
    try {
      await client.buckets.create(bucket)
      onChange()
      this.handleCloseModal()
      notify(bucketCreateSuccess())
    } catch (e) {
      console.error(e)
      notify(bucketCreateFailed())
    }
  }

  private handleOpenModal = (): void => {
    this.setState({overlayState: OverlayState.Open})
  }

  private handleCloseModal = (): void => {
    this.setState({overlayState: OverlayState.Closed})
  }

  private handleFilterBlur = (e: ChangeEvent<HTMLInputElement>): void => {
    this.setState({searchTerm: e.target.value})
  }

  private handleFilterChange = (e: ChangeEvent<HTMLInputElement>): void => {
    this.handleFilterUpdate(e.target.value)
  }

  private handleFilterUpdate = (searchTerm: string): void => {
    this.setState({searchTerm})
  }

  private prettyBuckets(buckets: Bucket[]): PrettyBucket[] {
    return buckets.map(b => {
      const expire = b.retentionRules.find(
        rule => rule.type === BucketRetentionRules.TypeEnum.Expire
      )

      if (!expire) {
        return {
          ...b,
          ruleString: 'forever',
        }
      }

      return {
        ...b,
        ruleString: ruleToString(expire.everySeconds),
      }
    })
  }

  private get emptyState(): JSX.Element {
    const {org} = this.props
    const {searchTerm} = this.state

    if (_.isEmpty(searchTerm)) {
      return (
        <EmptyState size={ComponentSize.Large}>
          <EmptyState.Text
            text={`${org.name} does not own any Buckets , why not create one?`}
            highlightWords={['Buckets']}
          />
          <Button
            text="Create Bucket"
            icon={IconFont.Plus}
            color={ComponentColor.Primary}
            onClick={this.handleOpenModal}
          />
        </EmptyState>
      )
    }

    return (
      <EmptyState size={ComponentSize.Large}>
        <EmptyState.Text text="No Buckets match your query" />
      </EmptyState>
    )
  }
}
